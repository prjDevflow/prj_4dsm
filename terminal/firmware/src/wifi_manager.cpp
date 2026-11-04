#include "wifi_manager.h"

#include <WiFi.h>

#include "log.h"

namespace {
constexpr uint32_t kAttemptTimeoutMs = 10000;
}  // namespace

WifiManager::WifiManager(const char* ssid, const char* password) : ssid_(ssid), password_(password) {}

void WifiManager::begin(uint32_t nowMs) {
  WiFi.persistent(false);        // do not rewrite the credentials in flash on every attempt
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(false);  // reconnecting is done here, with the growing delay
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
        WiFi.disconnect();
        waitBeforeRetry(nowMs, "sem conexao");
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
