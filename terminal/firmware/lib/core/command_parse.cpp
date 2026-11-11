#include "command_parse.h"

#include <ArduinoJson.h>
#include <string.h>

#include "iso8601.h"

namespace {
CommandType typeOf(const char* tipo) {
  if (tipo == nullptr) return CommandType::Unknown;
  if (strcmp(tipo, "ABRIR") == 0) return CommandType::Open;
  if (strcmp(tipo, "NEGAR") == 0) return CommandType::Deny;
  return CommandType::Unknown;
}

void copyReason(const char* motivo, char* out) {
  size_t i = 0;
  if (motivo != nullptr) {
    for (; i < kMaxReasonLength && motivo[i] != '\0'; ++i) out[i] = motivo[i];
  }
  out[i] = '\0';
}

// Keeps out sorted by id and, when full, only the lowest ids.
void insertSorted(TerminalCommand* out, size_t capacity, size_t& count, const TerminalCommand& command) {
  if (capacity == 0) return;
  if (count == capacity) {
    if (command.id >= out[count - 1].id) return;
    --count;  // the highest id leaves room
  }
  size_t i = count;
  for (; i > 0 && out[i - 1].id > command.id; --i) out[i] = out[i - 1];
  out[i] = command;
  ++count;
}
}  // namespace

bool parseCommands(const char* json, size_t length, TerminalCommand* out, size_t capacity, size_t& count) {
  count = 0;
  if (json == nullptr || out == nullptr) return false;
  JsonDocument doc;
  if (deserializeJson(doc, json, length) != DeserializationError::Ok) return false;
  const JsonArrayConst list = doc["commands"].as<JsonArrayConst>();
  if (list.isNull()) return false;

  for (JsonVariantConst value : list) {
    const JsonObjectConst item = value.as<JsonObjectConst>();
    const JsonVariantConst id = item["id"];
    if (!id.is<uint32_t>() || id.as<uint32_t>() == 0) continue;

    TerminalCommand command = {};
    command.id = id.as<uint32_t>();
    command.type = typeOf(item["tipo"].as<const char*>());
    command.openMs = item["aberturaMs"].is<uint32_t>() ? item["aberturaMs"].as<uint32_t>() : 0;
    copyReason(item["motivo"].as<const char*>(), command.reason);
    command.hasCreatedAt = parseIsoUtcMs(item["criadoEm"].as<const char*>(), command.createdAtMs);
    insertSorted(out, capacity, count, command);
  }
  return true;
}
