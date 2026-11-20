#include "nfc_message.h"

#include <ArduinoJson.h>
#include <string.h>

#include "iso8601.h"

size_t buildNfcJson(const char* uid, bool hasReadAt, int64_t readAtEpochMs, char* out, size_t outSize) {
  if (out == nullptr || outSize == 0) return 0;
  out[0] = '\0';
  JsonDocument doc;
  doc["uid"] = uid;
  if (hasReadAt) {
    char readAt[kIsoUtcLength + 1];
    if (formatIsoUtc(readAtEpochMs, readAt, sizeof readAt)) doc["lidoEm"] = readAt;
  }
  if (measureJson(doc) + 1 > outSize) return 0;
  return serializeJson(doc, out, outSize);
}

bool parseNfcResponse(const char* json, size_t length, NfcDecision& decision) {
  if (json == nullptr) return false;
  JsonDocument doc;
  if (deserializeJson(doc, json, length) != DeserializationError::Ok) return false;
  const char* result = doc["resultado"].as<const char*>();
  if (result == nullptr) return false;

  NfcDecision parsed = {};
  parsed.recognized = true;
  if (strcmp(result, "AUTORIZADO") == 0) {
    parsed.result = NfcResult::Authorized;
    parsed.openMs = doc["aberturaMs"].is<uint32_t>() ? doc["aberturaMs"].as<uint32_t>() : 0;
  } else if (strcmp(result, "CADASTRADA") == 0) {
    parsed.result = NfcResult::Enrolled;
  } else {
    parsed.result = NfcResult::Denied;
    parsed.recognized = strcmp(result, "NEGADO") == 0;
    const char* reason = parsed.recognized ? doc["motivo"].as<const char*>() : nullptr;
    size_t i = 0;
    if (reason != nullptr) {
      for (; i < sizeof parsed.reason - 1 && reason[i] != '\0'; ++i) parsed.reason[i] = reason[i];
    }
    parsed.reason[i] = '\0';
  }
  decision = parsed;
  return true;
}
