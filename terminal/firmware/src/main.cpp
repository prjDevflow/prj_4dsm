// Access terminal firmware (ESP32 DevKit V1).
// On power-up the turnstile closes (I07), the screen shows the state of the network and, as soon as the
// backend answers, the QR it issued (I06); the NFC reader is ready from the start (I10). The network runs in
// its own task on core 0 (net_task); loop() on core 1 handles the screen, the reader, the buzzer and the
// turnstile and never waits for the network.

#include <Arduino.h>
#include <string.h>

#include "bench_serial.h"
#include "buzzer.h"
#include "display.h"
#include "firmware_version.h"
#include "log.h"
#include "net_task.h"
#include "nfc_reader.h"
#include "pins.h"
#include "reset_reason.h"
#include "screen_text.h"
#include "secret_mask.h"
#include "secrets.h"
#include "signal_plan.h"
#include "turnstile.h"
#include "uid_debounce.h"

namespace {
constexpr uint32_t kBlinkPeriodMs = 500;
constexpr uint32_t kTagScreenMs = 2000;
constexpr uint32_t kResultScreenMs = 3000;  // guide, I06: a result stays 3 s, then the QR comes back
constexpr uint32_t kDefaultOpenMs = 5000;   // config.aberturaMs when nothing else says (guide, section 5.4)
constexpr uint32_t kNfcDecisionTimeoutMs = 15000;  // longer than two HTTP calls; then a new tag may go

enum class Screen : uint8_t { None, Status, Qr, Message };

// What the OLED shows now: the screen is redrawn only when this changes.
struct Shown {
  Screen screen = Screen::None;
  NetStatus status = NetStatus::Starting;
  char payload[kQrPayloadLength + 1] = {};
  uint32_t seconds = 0;
};

Shown shown;
SignalPlan signals;
UidDebounce debounce;
uint32_t messageUntilMs = 0;
bool awaitingNfc = false;  // a tag went to the backend and its decision has not come back yet
uint32_t awaitingNfcSinceMs = 0;
uint32_t lastBlinkMs = 0;
bool builtinLedOn = false;

// Safe state at power-up (guide, section 4): every signal off.
void setOutputsOff() {
  const uint8_t outputs[] = {PIN_BUZZER, PIN_LED_BUILTIN};
  for (uint8_t pin : outputs) {
    pinMode(pin, OUTPUT);
    digitalWrite(pin, LOW);
  }
}

void logBoot() {
  char maskedKey[16];
  LOGI("boot", "%s, firmware %s, ultimo reinicio: %s", TERMINAL_LABEL, FIRMWARE_VERSION,
       resetReasonText(esp_reset_reason()));
  LOGI("boot", "id %s, chave %s, API %s", TERMINAL_ID, maskSecret(TERMINAL_KEY, maskedKey, sizeof maskedKey),
       API_BASE_URL);
  if (strncmp(API_BASE_URL, "https", 5) == 0) {
    LOGW("boot", "API_BASE_URL com https: o TLS chega na I14; na rede local use http");
  }
}

const char* statusText(NetStatus status) {
  switch (status) {
    case NetStatus::NoWifi:
      return screen::kNoWifi;
    case NetStatus::NoServer:
      return screen::kNoServer;
    case NetStatus::InvalidKey:
      return screen::kInvalidKey;
    case NetStatus::Disabled:
      return screen::kDisabled;
    case NetStatus::Starting:
    case NetStatus::Online:  // online, but no QR on the screen yet
      break;
  }
  return screen::kStarting;
}

uint32_t secondsUntil(uint32_t instantMs, uint32_t nowMs) {
  const int32_t leftMs = static_cast<int32_t>(instantMs - nowMs);
  return leftMs <= 0 ? 0 : (static_cast<uint32_t>(leftMs) + 999) / 1000;
}

// A message over the QR for a while: a result or a tag that was read.
void showMessage(const char* title, const char* detail, uint32_t nowMs, uint32_t durationMs) {
  displayStatus(title, detail);
  shown.screen = Screen::Message;
  messageUntilMs = nowMs + durationMs;
}

// ABRIR: one beep, the turnstile open for openMs and "ACESSO LIBERADO" (guide, I07 and I08).
void grantAccess(uint32_t nowMs, uint32_t openMs) {
  LOGI("acesso", "liberado por %lu ms", static_cast<unsigned long>(openMs));
  signals.start(SignalEvent::Granted, nowMs, openMs);
  showMessage(screen::kGranted, TERMINAL_LABEL, nowMs, kResultScreenMs);
}

// NEGAR: three beeps and the reason; an opening in progress goes on (B15).
void denyAccess(uint32_t nowMs, const char* code) {
  LOGI("acesso", "negado: %s", code);
  signals.start(SignalEvent::Denied, nowMs);
  showMessage(screen::kDenied, reasonText(code), nowMs, kResultScreenMs);
}

// CADASTRADA: the admin's enrollment mode linked this tag to a user (B16); nobody goes through.
void tagEnrolled(uint32_t nowMs) {
  LOGI("acesso", "tag cadastrada");
  signals.start(SignalEvent::Enrolled, nowMs);
  showMessage(screen::kTagEnrolled, TERMINAL_LABEL, nowMs, kResultScreenMs);
}

bool resultOnScreen(uint32_t nowMs) {
  return shown.screen == Screen::Message && static_cast<int32_t>(nowMs - messageUntilMs) < 0;
}

bool waitingForNfc(uint32_t nowMs) {
  return awaitingNfc && nowMs - awaitingNfcSinceMs < kNfcDecisionTimeoutMs;
}

// A tag that passed the debounce: the beep and "Tag lida..." come before any network (I10), then the backend
// decides (I11). One reading at a time: while a decision is on its way or a result is on the screen, a new
// tag is ignored.
void handleTag(const char* uid, uint32_t nowMs) {
  if (waitingForNfc(nowMs) || resultOnScreen(nowMs)) {
    LOGI("nfc", "UID %s ignorado: o resultado anterior ainda esta na tela", uid);
    return;
  }
  LOGI("nfc", "UID: %s", uid);
  signals.start(SignalEvent::TagRead, nowMs);
  showMessage(screen::kTagRead, uid, nowMs, kNfcDecisionTimeoutMs);  // until the decision replaces it
  awaitingNfc = submitNfcReading(uid);
  awaitingNfcSinceMs = nowMs;
  if (!awaitingNfc) LOGE("nfc", "fila do NFC cheia: leitura descartada");
}

void pollNfc(uint32_t nowMs) {
  // While busy the reader is not even asked: a tag read now would be put to sleep (HaltA) and then ignored.
  // Left awake, it is read as soon as the terminal is free, e.g. a card that came with a keychain.
  if (waitingForNfc(nowMs) || resultOnScreen(nowMs)) return;
  char uid[kMaxUidTextLength + 1];
  // accept() runs on every reading, so a tag resting on the reader keeps its window open.
  if (!nfcPoll(nowMs, uid, sizeof uid) || !debounce.accept(uid, nowMs)) return;
  handleTag(uid, nowMs);
}

// Decisions of the backend: ABRIR or NEGAR after a QR validated in the app (I08), or the answer to a tag (I11).
void pollNet(uint32_t nowMs) {
  NetAction action;
  while (readNetAction(action)) {
    if (action.fromNfc) awaitingNfc = false;
    switch (action.type) {
      case NetActionType::Open:
        grantAccess(nowMs, action.openMs);
        break;
      case NetActionType::Deny:
        denyAccess(nowMs, action.reason);
        break;
      case NetActionType::Enrolled:
        tagEnrolled(nowMs);
        break;
    }
  }
}

void pollBench(uint32_t nowMs) {
  BenchCommand command;
  if (!readBenchCommand(command)) return;
  switch (command.type) {
    case BenchCommandType::Open:
      grantAccess(nowMs, command.openMs > 0 ? command.openMs : kDefaultOpenMs);
      break;
    case BenchCommandType::Deny:
      denyAccess(nowMs, command.code);
      break;
    case BenchCommandType::Read:
      if (command.code[0] != '\0') {
        handleTag(command.code, nowMs);  // "read <UID>": the whole flow, as if the tag were on the reader
      } else {
        signals.start(SignalEvent::TagRead, nowMs);
        showMessage(screen::kTagRead, "bancada", nowMs, kTagScreenMs);
      }
      break;
  }
}

void applySignals(uint32_t nowMs) {
  const SignalOutputs outputs = signals.update(nowMs);
  buzzerApply(outputs.buzzerOn);
  turnstileApply(outputs.turnstileOpen, nowMs);
}

// A message while it lasts; then the QR while it is valid, never an expired one (guide, I06); the network
// status otherwise.
void updateScreen(uint32_t nowMs) {
  if (shown.screen == Screen::Message && static_cast<int32_t>(nowMs - messageUntilMs) < 0) return;
  const NetSnapshot net = readNetSnapshot();
  if (net.hasQr && static_cast<int32_t>(nowMs - net.qrValidUntilMs) <= 0) {
    const uint32_t seconds = secondsUntil(net.nextQrMs, nowMs);
    if (shown.screen == Screen::Qr && shown.seconds == seconds && strcmp(shown.payload, net.qrPayload) == 0) {
      return;
    }
    if (displayQr(net.qrPayload, TERMINAL_LABEL, seconds)) {
      shown.screen = Screen::Qr;
      shown.seconds = seconds;
      memcpy(shown.payload, net.qrPayload, sizeof shown.payload);
      return;
    }
    static bool warned = false;
    if (!warned) {
      LOGE("tela", "o QR nao cabe na tela: nada desenhado");
      warned = true;
    }
  }
  if (shown.screen == Screen::Status && shown.status == net.status) return;
  displayStatus(statusText(net.status), TERMINAL_LABEL);
  shown.screen = Screen::Status;
  shown.status = net.status;
}
}  // namespace

void setup() {
  setOutputsOff();
  turnstileCloseAtBoot();  // safe state first, before Wi-Fi also draws current
  Serial.begin(115200);
  logBoot();
  displayBegin();
  updateScreen(millis());  // "Iniciando..." before the network starts
  buzzerBegin();
  nfcBegin();
  startNetTask();
}

void loop() {
  const uint32_t nowMs = millis();
  pollNet(nowMs);
  pollBench(nowMs);
  pollNfc(nowMs);
  applySignals(nowMs);
  updateScreen(nowMs);

  // The on-board LED blinks while the loop runs; it keeps blinking during network calls (I04).
  if (nowMs - lastBlinkMs >= kBlinkPeriodMs) {
    lastBlinkMs = nowMs;
    builtinLedOn = !builtinLedOn;
    digitalWrite(PIN_LED_BUILTIN, builtinLedOn ? HIGH : LOW);
  }

  delay(5);  // short on purpose: the loop never blocks for long
}
