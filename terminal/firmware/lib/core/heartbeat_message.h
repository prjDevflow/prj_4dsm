#pragma once
#include <stddef.h>
#include <stdint.h>

// What the terminal reports every 10 s in POST /terminal/heartbeat (backend doc 03, section 4.5).
struct HeartbeatData {
  bool hasPosition;  // without it, latitude and longitude go as null (guide question 2, B11)
  double latitude;
  double longitude;
  bool gpsFix;
  bool gpsSimulated;  // fixed coordinates of secrets.h (I09)
  const char* firmware;
  uint32_t uptimeS;
  int wifiRssi;  // dBm, -127 to 0
  uint32_t pendingEvents;  // size of the offline queue (I12)
};

// Parameters the backend sends back in "config". Without an answer, these defaults (guide, section 5.4).
struct TerminalConfig {
  uint32_t qrRefreshMs = 10000;
  uint32_t commandPollMs = 1000;
  uint32_t openMs = 5000;  // aberturaMs
};

// Writes the JSON body, exactly the eight fields of the contract. Returns its length, or 0 (out empty) when
// the buffer is too small.
size_t buildHeartbeatJson(const HeartbeatData& data, char* out, size_t outSize);

// Reads a 200 answer: false without a valid serverTime. Each config field missing, not a number or out of a
// sane range falls back to its own default.
bool parseHeartbeatResponse(const char* json, size_t length, int64_t& serverTimeMs, TerminalConfig& config);
