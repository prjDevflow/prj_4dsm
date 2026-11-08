#include "qr_response.h"

#include <ArduinoJson.h>
#include <string.h>

#include "iso8601.h"

namespace {
constexpr int64_t kMaxQrValidityMs = 5 * 60 * 1000;
constexpr uint32_t kMaxQrRefreshMs = 60 * 1000;
}  // namespace

bool parseQrResponse(const char* json, size_t length, QrResponse& out) {
  if (json == nullptr) return false;
  JsonDocument doc;
  if (deserializeJson(doc, json, length) != DeserializationError::Ok) return false;

  const char* payload = doc["payload"].as<const char*>();
  if (!isValidQrPayload(payload)) return false;

  int64_t issuedMs = 0;
  int64_t expiresMs = 0;
  if (!parseIsoUtcMs(doc["emitidoEm"].as<const char*>(), issuedMs) ||
      !parseIsoUtcMs(doc["expiraEm"].as<const char*>(), expiresMs)) {
    return false;
  }
  const int64_t validityMs = expiresMs - issuedMs;
  if (validityMs <= 0 || validityMs > kMaxQrValidityMs) return false;

  const JsonVariantConst refresh = doc["renovarEmMs"];
  const bool refreshUsable =
      refresh.is<uint32_t>() && refresh.as<uint32_t>() > 0 && refresh.as<uint32_t>() <= kMaxQrRefreshMs;

  memcpy(out.payload, payload, kQrPayloadLength + 1);
  out.validityMs = static_cast<uint32_t>(validityMs);
  out.refreshMs = refreshUsable ? refresh.as<uint32_t>() : kDefaultQrRefreshMs;
  return true;
}
