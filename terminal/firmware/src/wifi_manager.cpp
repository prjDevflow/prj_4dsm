#include "wifi_manager.h"

#include <WiFi.h>

#include "log.h"

namespace {
constexpr uint32_t kAttemptTimeoutMs = 10000;
constexpr int16_t kMaxListedNetworks = 10;

// Reason of the last disconnection, written by the Wi-Fi event task.
volatile uint8_t lastDisconnectReason = 0;

void onDisconnected(arduino_event_id_t, arduino_event_info_t info) {
  lastDisconnectReason = info.wifi_sta_disconnected.reason;
}

// Why an attempt failed, in words the person at the bench can act on.
const char* failureText(uint8_t reason) {
  switch (reason) {
    case WIFI_REASON_NO_AP_FOUND:
      return "rede nao encontrada (outro nome, so 5 GHz ou fora de alcance)";
    case WIFI_REASON_AUTH_FAIL:
    case WIFI_REASON_4WAY_HANDSHAKE_TIMEOUT:
    case WIFI_REASON_HANDSHAKE_TIMEOUT:
      return "senha recusada";
    default:
      return "sem conexao";
  }
}

// The networks the ESP32 sees (2.4 GHz only), with the exact names to put in secrets.h. Blocks about 2 s:
// it runs only in the network task, and only when the network was not found.
void logVisibleNetworks() {
  const int16_t count = WiFi.scanNetworks();
  if (count <= 0) {
    LOGW("wifi", "nenhuma rede de 2,4 GHz visivel");
    return;
  }
  LOGI("wifi", "redes visiveis (2,4 GHz):");
  for (int16_t i = 0; i < count && i < kMaxListedNetworks; ++i) {
    LOGI("wifi", "  \"%s\", canal %ld, %ld dBm", WiFi.SSID(i).c_str(), static_cast<long>(WiFi.channel(i)),
         static_cast<long>(WiFi.RSSI(i)));
  }
  WiFi.scanDelete();
}
}  // namespace

WifiManager::WifiManager(const char* ssid, const char* password) : ssid_(ssid), password_(password) {}

void WifiManager::begin(uint32_t nowMs) {
  WiFi.persistent(false);        // do not rewrite the credentials in flash on every attempt
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(false);  // reconnecting is done here, with the growing delay
  WiFi.onEvent(onDisconnected, ARDUINO_EVENT_WIFI_STA_DISCONNECTED);
  startAttempt(nowMs);
}

void WifiManager::tick(uint32_t nowMs) {
  const bool linkUp = WiFi.status() == WL_CONNECTED;
  switch (state_) {
    case State::Idle:
      break;
    case State::Connecting:
      if (linkUp) {
        onConnected(nowMs);
      } else if (nowMs - stateSinceMs_ >= kAttemptTimeoutMs) {
        const uint8_t reason = lastDisconnectReason;
        WiFi.disconnect();
        if (reason == WIFI_REASON_NO_AP_FOUND) logVisibleNetworks();
        waitBeforeRetry(millis(), failureText(reason));
      }
      break;
    case State::Connected:
      if (!linkUp) waitBeforeRetry(nowMs, "conexao perdida");
      break;
    case State::Waiting:
      if (linkUp) {
        onConnected(nowMs);
      } else if (nowMs - stateSinceMs_ >= waitMs_) {
        startAttempt(nowMs);
      }
      break;
  }
}

void WifiManager::startAttempt(uint32_t nowMs) {
  LOGI("wifi", "conectando em \"%s\"", ssid_);
  WiFi.disconnect();
  lastDisconnectReason = 0;  // the reason that counts is the one of this attempt
  WiFi.begin(ssid_, password_);
  state_ = State::Connecting;
  stateSinceMs_ = nowMs;
}

void WifiManager::onConnected(uint32_t nowMs) {
  LOGI("wifi", "conectado em %lu ms: IP %s, RSSI %d dBm", static_cast<unsigned long>(nowMs - stateSinceMs_),
       WiFi.localIP().toString().c_str(), WiFi.RSSI());
  backoff_.reset();
  state_ = State::Connected;
  stateSinceMs_ = nowMs;
}

void WifiManager::waitBeforeRetry(uint32_t nowMs, const char* why) {
  waitMs_ = backoff_.nextDelayMs();
  LOGW("wifi", "%s; nova tentativa em %lu s", why, static_cast<unsigned long>(waitMs_ / 1000));
  state_ = State::Waiting;
  stateSinceMs_ = nowMs;
}
