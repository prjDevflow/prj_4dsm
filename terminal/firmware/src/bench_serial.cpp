#include "bench_serial.h"

#ifdef RELEASE_BUILD

bool readBenchCommand(BenchCommand&) { return false; }

#else

#include <Arduino.h>
#include <ctype.h>
#include <stdlib.h>
#include <string.h>

#include "log.h"

namespace {
char line[48];
size_t length = 0;

void copyUpper(const char* text, char* out, size_t outSize) {
  size_t i = 0;
  for (; text[i] != '\0' && i + 1 < outSize; ++i) out[i] = static_cast<char>(toupper(static_cast<unsigned char>(text[i])));
  out[i] = '\0';
}

bool parseLine(const char* text, BenchCommand& command) {
  command.openMs = 0;
  command.code[0] = '\0';
  if (strncmp(text, "open", 4) == 0 && (text[4] == '\0' || text[4] == ' ')) {
    command.type = BenchCommandType::Open;
    if (text[4] == ' ') command.openMs = static_cast<uint32_t>(strtoul(text + 5, nullptr, 10));
    return true;
  }
  if (strncmp(text, "deny ", 5) == 0 && text[5] != '\0') {
    command.type = BenchCommandType::Deny;
    copyUpper(text + 5, command.code, sizeof command.code);
    return true;
  }
  if (strncmp(text, "read", 4) == 0 && (text[4] == '\0' || text[4] == ' ')) {
    command.type = BenchCommandType::Read;
    if (text[4] == ' ') copyUpper(text + 5, command.code, sizeof command.code);
    return true;
  }
  return false;
}
}  // namespace

bool readBenchCommand(BenchCommand& command) {
  while (Serial.available() > 0) {
    const char c = static_cast<char>(Serial.read());
    if (c == '\r' || c == '\n') {
      if (length == 0) continue;
      line[length] = '\0';
      length = 0;
      if (parseLine(line, command)) return true;
      LOGW("bancada", "comando desconhecido: %s (use open [ms], deny <CODIGO> ou read)", line);
    } else if (length < sizeof line - 1) {
      line[length++] = c;
    }
  }
  return false;
}

#endif
