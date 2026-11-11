#pragma once
#include <stdint.h>

#include "backoff.h"

// Keeps the ESP32 on the Wi-Fi from secrets.h without blocking the loop (guide, I03).
// Each attempt gets up to 10 s to connect. After a failed attempt or a dropped connection it waits
// the growing delay (1, 2, 4, 8, 16, then 30 s) and tries again; a connection resets the delay.
class WifiManager {
 public:
  WifiManager(const char* ssid, const char* password);

  // Starts the first attempt. Call once, from setup().
  void begin(uint32_t nowMs);

  // Advances the state machine. Call on every loop() pass; it returns at once.
  void tick(uint32_t nowMs);

  bool connected() const { return state_ == State::Connected; }

 private:
  enum class State { Idle, Connecting, Connected, Waiting };

  void startAttempt(uint32_t nowMs);
  void onConnected(uint32_t nowMs);
  void waitBeforeRetry(uint32_t nowMs, const char* why);

  const char* ssid_;
  const char* password_;
  State state_ = State::Idle;
  uint32_t stateSinceMs_ = 0;
  uint32_t waitMs_ = 0;
  Backoff backoff_;
};
