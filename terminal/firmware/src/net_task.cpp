#include "net_task.h"

#include <Arduino.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <WiFi.h>
#include <esp_timer.h>
#include <stdio.h>
#include <string.h>

#include <esp_system.h>

#include "api_client.h"
#include "clock_sync.h"
#include "command_filter.h"
#include "command_parse.h"
#include "nfc_message.h"
#include "uid_format.h"
#include "uuid_v4.h"
#include "firmware_version.h"
#include "heartbeat_message.h"
#include "iso8601.h"
#include "log.h"
#include "qr_response.h"
#include "qr_scheduler.h"
#include "secrets.h"
#include "server_health.h"
#include "wifi_manager.h"

namespace {
constexpr uint32_t kStackBytes = 10240;
constexpr UBaseType_t kPriority = 1;
constexpr BaseType_t kCore = 0;  // loop() runs on core 1
constexpr uint32_t kTickMs = 50;
constexpr uint32_t kStartingMs = 12000;  // the first Wi-Fi attempt takes up to 10 s: "Iniciando..." until then
constexpr uint32_t kHeartbeatMs = 10000;       // contract, section 4.5
constexpr uint32_t kRejectedRetryMs = 60000;   // 401, 403, 422: guide, section 6

constexpr UBaseType_t kActionQueueLength = 8;
constexpr UBaseType_t kNfcQueueLength = 2;
const char kNvsNamespace[] = "terminal";
const char kNvsCommandKey[] = "cmdAfter";
const char kOfflineReason[] = "TERMINAL_OFFLINE";

// A tag read by loop(), on its way to the backend.
struct NfcReading {
  char uid[kMaxUidTextLength + 1];
};

QueueHandle_t snapshotQueue = nullptr;  // one slot, always the latest snapshot
QueueHandle_t actionQueue = nullptr;    // decisions of the backend for loop(), in order
QueueHandle_t nfcQueue = nullptr;       // tags read by loop(), for the backend

// State of the network task only: nothing else touches it.
ClockSync serverClock;
TerminalConfig config;
ServerHealth health;
uint32_t nextHeartbeatMs = 0;
uint32_t nextCommandPollMs = 0;

bool reached(uint32_t nowMs, uint32_t instantMs) { return static_cast<int32_t>(nowMs - instantMs) >= 0; }

// The highest command id ever decided, in the NVS: it survives a restart (guide, I08, answer 12).
class NvsCommandIdStore : public CommandIdStore {
 public:
  bool load(uint32_t& id) override {
    if (!open() || !prefs_.isKey(kNvsCommandKey)) return false;
    id = prefs_.getUInt(kNvsCommandKey, 0);
    return true;
  }
  void save(uint32_t id) override {
    if (open()) prefs_.putUInt(kNvsCommandKey, id);
  }

 private:
  bool open() {
    if (!opened_) opened_ = prefs_.begin(kNvsNamespace, false);
    return opened_;
  }

  Preferences prefs_;
  bool opened_ = false;
};

const char* statusName(NetStatus status) {
  switch (status) {
    case NetStatus::Starting:
      return "iniciando";
    case NetStatus::NoWifi:
      return "sem Wi-Fi";
    case NetStatus::NoServer:
      return "sem servidor";
    case NetStatus::InvalidKey:
      return "chave invalida";
    case NetStatus::Disabled:
      return "terminal desativado";
    case NetStatus::Online:
      return "online";
  }
  return "?";
}

void publish(const NetSnapshot& snapshot) {
  static NetStatus lastLogged = NetStatus::Starting;
  if (snapshot.status != lastLogged) {
    LOGI("rede", "estado: %s", statusName(snapshot.status));
    lastLogged = snapshot.status;
  }
  xQueueOverwrite(snapshotQueue, &snapshot);
}

// GET /health once per Wi-Fi connection: the log tells whether the backend and its database answer (I04).
void logHealth(ApiClient& api) {
  const ApiResponse response = api.get("/health");
  if (response.result != HttpResult::Ok) {
    LOGW("api", "servidor: sem resposta (codigo %d)", response.status);
    return;
  }
  JsonDocument doc;
  deserializeJson(doc, response.body);
  LOGI("api", "servidor: OK, versao %s, banco %s", doc["version"] | "?", doc["db"] | "?");
}

HeartbeatData heartbeatData() {
  HeartbeatData data;
#if defined(GPS_FIXED_LAT) && defined(GPS_FIXED_LON)
  // Fixed coordinates of secrets.h, sent as simulated GPS (guide, I09).
  data.hasPosition = true;
  data.latitude = GPS_FIXED_LAT;
  data.longitude = GPS_FIXED_LON;
  data.gpsFix = true;
  data.gpsSimulated = true;
#else
  data.hasPosition = false;  // the real GPS comes with I09
  data.latitude = 0;
  data.longitude = 0;
  data.gpsFix = false;
  data.gpsSimulated = false;
#endif
  data.firmware = FIRMWARE_VERSION;
  data.uptimeS = static_cast<uint32_t>(esp_timer_get_time() / 1000000);
  const int rssi = WiFi.RSSI();
  data.wifiRssi = rssi < -127 ? -127 : (rssi > 0 ? 0 : rssi);
  data.pendingEvents = 0;  // the offline queue comes with I12
  return data;
}

// POST /terminal/heartbeat every 10 s (guide, I05): keeps the terminal online in the app, syncs the clock used
// for the age of the commands and brings the config of the backend.
void sendHeartbeat(ApiClient& api, NetSnapshot& snapshot) {
  nextHeartbeatMs = millis() + kHeartbeatMs;
  char body[256];
  if (buildHeartbeatJson(heartbeatData(), body, sizeof body) == 0) {
    LOGE("hb", "o corpo do heartbeat nao coube no buffer");
    return;
  }
  const ApiResponse response = api.post("/terminal/heartbeat", body);
  const uint32_t atMs = millis();
  switch (response.result) {
    case HttpResult::Ok: {
      int64_t serverTimeMs = 0;
      if (!parseHeartbeatResponse(response.body.c_str(), response.body.length(), serverTimeMs, config)) {
        LOGE("hb", "resposta fora do contrato");
        return;
      }
      const bool firstSync = !serverClock.synced();
      serverClock.sync(serverTimeMs, atMs);
      health.success();
      if (firstSync) {
        char now[kIsoUtcLength + 1];
        formatIsoUtc(serverTimeMs, now, sizeof now);
        LOGI("hb", "relogio sincronizado: %s; abertura %lu ms, comandos a cada %lu ms", now,
             static_cast<unsigned long>(config.openMs), static_cast<unsigned long>(config.commandPollMs));
      }
      return;
    }
    case HttpResult::Unauthorized:
      nextHeartbeatMs = atMs + kRejectedRetryMs;
      snapshot.status = NetStatus::InvalidKey;
      LOGE("hb", "401: chave do terminal recusada");
      return;
    case HttpResult::Forbidden:
      nextHeartbeatMs = atMs + kRejectedRetryMs;
      snapshot.status = NetStatus::Disabled;
      LOGE("hb", "403: terminal desativado");
      return;
    case HttpResult::Unprocessable:
      nextHeartbeatMs = atMs + kRejectedRetryMs;
      LOGE("hb", "422: corpo fora do contrato (erro do firmware)");
      return;
    case HttpResult::RateLimited:
      LOGW("hb", "429: heartbeat antes do intervalo minimo de 2 s");
      return;
    default:
      health.failure();
      LOGW("hb", "sem resposta (codigo %d)", response.status);
      if (!health.reachable()) snapshot.status = NetStatus::NoServer;
      return;
  }
}

void copyReason(char* out, size_t outSize, const char* code) {
  size_t i = 0;
  for (; i + 1 < outSize && code[i] != '\0'; ++i) out[i] = code[i];
  out[i] = '\0';
}

// POST /terminal/nfc (guide, I11; B17): one Idempotency-Key per reading, kept for its automatic retry after a
// network failure, so the backend never counts the same reading twice. The answer is the decision. Without an
// answer (no Wi-Fi, timeout, 5xx) the reading is denied as TERMINAL_OFFLINE, "Sem conexao": the policy of
// decision 10 of the contract; keeping the attempt for later is the offline queue of I12.
void validateNfc(ApiClient& api, const NfcReading& reading, bool online, NetSnapshot& snapshot) {
  NetAction action = {};
  action.fromNfc = true;
  action.type = NetActionType::Deny;
  if (!online) {
    copyReason(action.reason, sizeof action.reason, kOfflineReason);
    LOGW("nfc", "sem Wi-Fi: UID %s negado como TERMINAL_OFFLINE", reading.uid);
    xQueueSend(actionQueue, &action, 0);
    return;
  }

  uint8_t random[16];
  esp_fill_random(random, sizeof random);
  char key[kUuidLength + 1];
  formatUuidV4(random, key, sizeof key);
  char body[96];
  const bool synced = serverClock.synced();
  buildNfcJson(reading.uid, synced, synced ? serverClock.nowEpochMs(millis()) : 0, body, sizeof body);

  const uint32_t startMs = millis();
  ApiResponse response = api.post("/terminal/nfc", body, key);
  if (response.result == HttpResult::NetworkError) {
    LOGW("nfc", "falha de rede: repetindo a mesma leitura com a mesma chave");
    response = api.post("/terminal/nfc", body, key);
  }
  const unsigned long tookMs = millis() - startMs;

  NfcDecision decision;
  if (response.result == HttpResult::Ok &&
      parseNfcResponse(response.body.c_str(), response.body.length(), decision)) {
    switch (decision.result) {
      case NfcResult::Authorized:
        action.type = NetActionType::Open;
        action.openMs = decision.openMs > 0 ? decision.openMs : config.openMs;
        LOGI("nfc", "UID %s: AUTORIZADO em %lu ms", reading.uid, tookMs);
        break;
      case NfcResult::Enrolled:
        action.type = NetActionType::Enrolled;
        LOGI("nfc", "UID %s: CADASTRADA em %lu ms", reading.uid, tookMs);
        break;
      case NfcResult::Denied:
        copyReason(action.reason, sizeof action.reason, decision.reason);
        if (!decision.recognized) LOGW("nfc", "resultado desconhecido: tratado como negado");
        LOGI("nfc", "UID %s: NEGADO (%s) em %lu ms", reading.uid, decision.reason, tookMs);
        break;
    }
  } else if (response.result == HttpResult::Ok) {
    LOGE("nfc", "resposta fora do contrato: leitura negada");
  } else if (response.result == HttpResult::Unauthorized || response.result == HttpResult::Forbidden) {
    snapshot.status =
        response.result == HttpResult::Unauthorized ? NetStatus::InvalidKey : NetStatus::Disabled;
    LOGE("nfc", "%d: o terminal nao foi aceito; leitura negada", response.status);
  } else if (response.result == HttpResult::Timeout || response.result == HttpResult::NetworkError ||
             response.result == HttpResult::ServerError) {
    copyReason(action.reason, sizeof action.reason, kOfflineReason);
    LOGW("nfc", "sem resposta (codigo %d, %lu ms): UID %s negado como TERMINAL_OFFLINE", response.status, tookMs,
         reading.uid);
  } else {
    LOGE("nfc", "codigo %d: leitura negada", response.status);  // 409 or 422: a firmware bug
  }
  xQueueSend(actionQueue, &action, 0);
}

// GET /terminal/commands every commandPollMs (guide, I08). Each new command is saved in the NVS by the filter
// before its action goes to loop(); the acks go after every action is on its way.
void pollCommands(ApiClient& api, CommandFilter& filter, NetSnapshot& snapshot) {
  nextCommandPollMs = millis() + config.commandPollMs;
  char path[64];
  snprintf(path, sizeof path, "/terminal/commands?after=%lu&limit=%u", static_cast<unsigned long>(filter.after()),
           static_cast<unsigned>(kMaxCommandsPerPoll));
  const ApiResponse response = api.get(path);
  if (response.result == HttpResult::Unauthorized || response.result == HttpResult::Forbidden) {
    nextCommandPollMs = millis() + kRejectedRetryMs;
    snapshot.status =
        response.result == HttpResult::Unauthorized ? NetStatus::InvalidKey : NetStatus::Disabled;
    return;
  }
  if (response.result != HttpResult::Ok) {
    LOGD("cmd", "consulta sem resposta (codigo %d)", response.status);
    return;
  }

  TerminalCommand commands[kMaxCommandsPerPoll];
  size_t count = 0;
  if (!parseCommands(response.body.c_str(), response.body.length(), commands, kMaxCommandsPerPoll, count)) {
    LOGE("cmd", "resposta fora do contrato");
    return;
  }
  const bool synced = serverClock.synced();
  const int64_t nowEpochMs = synced ? serverClock.nowEpochMs(millis()) : 0;
  uint32_t toAck[kMaxCommandsPerPoll];
  size_t ackCount = 0;
  for (size_t i = 0; i < count; ++i) {
    const TerminalCommand& command = commands[i];
    const unsigned long id = command.id;
    switch (filter.decide(command.id, command.hasCreatedAt, command.createdAtMs, synced, nowEpochMs)) {
      case CommandDecision::Duplicate:
        continue;
      case CommandDecision::Expired:
        LOGW("cmd", "comando %lu com mais de 10 s: ignorado", id);
        continue;
      case CommandDecision::Execute:
        break;
    }
    if (!synced) LOGW("cmd", "relogio ainda nao sincronizado: comando %lu aceito so pelo id", id);
    if (command.type == CommandType::Unknown) {
      LOGW("cmd", "comando %lu de tipo desconhecido: ignorado", id);
      continue;
    }
    NetAction action = {};
    action.type = command.type == CommandType::Open ? NetActionType::Open : NetActionType::Deny;
    action.openMs = command.openMs > 0 ? command.openMs : config.openMs;
    memcpy(action.reason, command.reason, sizeof action.reason);
    xQueueSend(actionQueue, &action, 0);
    LOGI("cmd", "comando %lu: %s", id, command.type == CommandType::Open ? "ABRIR" : "NEGAR");
    toAck[ackCount++] = command.id;
  }
  for (size_t i = 0; i < ackCount; ++i) {
    char ackPath[48];
    snprintf(ackPath, sizeof ackPath, "/terminal/commands/%lu/ack", static_cast<unsigned long>(toAck[i]));
    const ApiResponse ack = api.post(ackPath);
    if (ack.result != HttpResult::Ok) {
      LOGW("cmd", "ack do comando %lu falhou (codigo %d)", static_cast<unsigned long>(toAck[i]), ack.status);
    }
  }
}

// One POST /terminal/qr (guide, I06): the answer moves the schedule and the snapshot. The token never goes
// to the log.
void requestQr(ApiClient& api, QrScheduler& scheduler, NetSnapshot& snapshot) {
  const uint32_t startMs = millis();
  scheduler.requestStarted(startMs);
  const ApiResponse response = api.post("/terminal/qr");
  const uint32_t endMs = millis();
  const unsigned long tookMs = endMs - startMs;

  QrResponse qr;
  switch (response.result) {
    case HttpResult::Ok:
      if (parseQrResponse(response.body.c_str(), response.body.length(), qr)) {
        scheduler.succeeded(qr.validityMs, qr.refreshMs);
        memcpy(snapshot.qrPayload, qr.payload, sizeof snapshot.qrPayload);
        snapshot.status = NetStatus::Online;
        LOGI("qr", "QR novo em %lu ms, vale %lu s", tookMs, static_cast<unsigned long>(qr.validityMs / 1000));
        return;
      }
      scheduler.failed(endMs, 0);
      snapshot.status = NetStatus::NoServer;
      LOGE("qr", "resposta fora do contrato: nada desenhado");
      break;
    case HttpResult::Unauthorized:
      scheduler.rejected(endMs);
      snapshot.status = NetStatus::InvalidKey;
      LOGE("qr", "401: chave do terminal recusada");
      break;
    case HttpResult::Forbidden:
      scheduler.rejected(endMs);
      snapshot.status = NetStatus::Disabled;
      LOGE("qr", "403: terminal desativado");
      break;
    case HttpResult::RateLimited:
      scheduler.failed(endMs, response.retryAfterMs);
      LOGW("qr", "429: pedido antes do intervalo minimo do backend");
      break;
    default:
      scheduler.failed(endMs, 0);
      snapshot.status = NetStatus::NoServer;
      LOGW("qr", "sem QR (codigo %d, %lu ms)", response.status, tookMs);
      break;
  }
  LOGI("qr", "nova tentativa em %lu s", static_cast<unsigned long>(scheduler.secondsToNextRequest(millis())));
}

void netTask(void*) {
  WifiManager wifi(WIFI_SSID, WIFI_PASSWORD);
  ApiClient api(API_BASE_URL, TERMINAL_ID, TERMINAL_KEY);
  QrScheduler scheduler;
  NvsCommandIdStore commandStore;
  CommandFilter commandFilter(commandStore);
  NetSnapshot snapshot;
  bool connectionChecked = false;
  const uint32_t bootMs = millis();
  LOGI("cmd", "ultimo comando visto: %lu", static_cast<unsigned long>(commandFilter.after()));
  wifi.begin(bootMs);

  for (;;) {
    const uint32_t nowMs = millis();
    wifi.tick(nowMs);
    // A person is waiting in front of the reader: the tag goes before anything else.
    NfcReading reading;
    if (xQueueReceive(nfcQueue, &reading, 0) == pdTRUE) validateNfc(api, reading, wifi.connected(), snapshot);
    if (!wifi.connected()) {
      connectionChecked = false;
      snapshot.status = nowMs - bootMs < kStartingMs ? NetStatus::Starting : NetStatus::NoWifi;
    } else {
      if (!connectionChecked) {
        // A new connection: check the backend and send the heartbeat at once, to sync the clock early.
        connectionChecked = true;
        logHealth(api);
        if (snapshot.status == NetStatus::NoWifi) snapshot.status = NetStatus::Starting;
        nextHeartbeatMs = millis();
      }
      if (reached(millis(), nextHeartbeatMs)) sendHeartbeat(api, snapshot);
      // Commands before the QR: they are what the person in front of the turnstile is waiting for.
      if (reached(millis(), nextCommandPollMs)) pollCommands(api, commandFilter, snapshot);
      if (scheduler.due(millis())) requestQr(api, scheduler, snapshot);
    }
    // qrValid() also drops an expired QR for good, so it cannot come back when millis() wraps.
    snapshot.hasQr = scheduler.qrValid(millis());
    snapshot.qrValidUntilMs = scheduler.qrValidUntilMs();
    snapshot.nextQrMs = scheduler.nextRequestMs();
    publish(snapshot);
    vTaskDelay(pdMS_TO_TICKS(kTickMs));
  }
}
}  // namespace

void startNetTask() {
  snapshotQueue = xQueueCreate(1, sizeof(NetSnapshot));
  actionQueue = xQueueCreate(kActionQueueLength, sizeof(NetAction));
  nfcQueue = xQueueCreate(kNfcQueueLength, sizeof(NfcReading));
  const NetSnapshot starting;
  xQueueOverwrite(snapshotQueue, &starting);
  xTaskCreatePinnedToCore(netTask, "netTask", kStackBytes, nullptr, kPriority, nullptr, kCore);
}

NetSnapshot readNetSnapshot() {
  NetSnapshot snapshot;
  if (snapshotQueue != nullptr) xQueuePeek(snapshotQueue, &snapshot, 0);
  return snapshot;
}

bool readNetAction(NetAction& action) {
  return actionQueue != nullptr && xQueueReceive(actionQueue, &action, 0) == pdTRUE;
}

bool submitNfcReading(const char* uid) {
  if (nfcQueue == nullptr || uid == nullptr) return false;
  NfcReading reading = {};
  copyReason(reading.uid, sizeof reading.uid, uid);
  return xQueueSend(nfcQueue, &reading, 0) == pdTRUE;
}
