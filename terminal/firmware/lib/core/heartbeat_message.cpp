#include "heartbeat_message.h"

#include <ArduinoJson.h>

#include "iso8601.h"

namespace {
uint32_t fieldOr(JsonVariantConst value, uint32_t minimum, uint32_t maximum, uint32_t fallback) {
  if (!value.is<uint32_t>()) return fallback;
  const uint32_t number = value.as<uint32_t>();
  return number >= minimum && number <= maximum ? number : fallback;
}
}  // namespace

size_t buildHeartbeatJson(const HeartbeatData& data, char* out, size_t outSize) {
  if (out == nullptr || outSize == 0) return 0;
  out[0] = '\0';
  JsonDocument doc;
  if (data.hasPosition) {
    doc["latitude"] = data.latitude;
    doc["longitude"] = data.longitude;
  } else {
    doc["latitude"] = nullptr;
    doc["longitude"] = nullptr;
  }
  doc["gpsFix"] = data.gpsFix;
  doc["gpsSimulado"] = data.gpsSimulated;
  doc["firmware"] = data.firmware;
  doc["uptimeS"] = data.uptimeS;
  doc["wifiRssi"] = data.wifiRssi;
  doc["eventosPendentes"] = data.pendingEvents;
  if (measureJson(doc) + 1 > outSize) return 0;
  return serializeJson(doc, out, outSize);
}

bool parseHeartbeatResponse(const char* json, size_t length, int64_t& serverTimeMs, TerminalConfig& config) {
  if (json == nullptr) return false;
  JsonDocument doc;
  if (deserializeJson(doc, json, length) != DeserializationError::Ok) return false;

  int64_t serverMs = 0;
  if (!parseIsoUtcMs(doc["serverTime"].as<const char*>(), serverMs)) return false;

  const JsonVariantConst received = doc["config"];
  TerminalConfig parsed;
  parsed.qrRefreshMs = fieldOr(received["qrRefreshMs"], 1000, 60000, parsed.qrRefreshMs);
  parsed.commandPollMs = fieldOr(received["commandPollMs"], 200, 10000, parsed.commandPollMs);
  parsed.openMs = fieldOr(received["aberturaMs"], 500, 30000, parsed.openMs);

  serverTimeMs = serverMs;
  config = parsed;
  return true;
}
