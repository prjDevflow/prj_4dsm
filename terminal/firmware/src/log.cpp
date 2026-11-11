#include "log.h"

#include <Arduino.h>
#include <stdarg.h>

void logPrintf(char level, const char* tag, const char* format, ...) {
  char message[192];
  va_list args;
  va_start(args, format);
  vsnprintf(message, sizeof message, format, args);
  va_end(args);
  Serial.printf("[%8lu] %c %s: %s\n", static_cast<unsigned long>(millis()), level, tag, message);
}
