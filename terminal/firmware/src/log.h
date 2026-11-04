#pragma once
// Serial log with levels E, W, I, D (guide, I03). Example line:
//   [   12345] I wifi: conectado
// Keys and passwords never go to the log as they are: use maskSecret() from lib/core/secret_mask.h.

// 0 = off, 1 = errors, 2 = + warnings, 3 = + info, 4 = + debug. Override with -D TERMINAL_LOG_LEVEL=4.
#ifndef TERMINAL_LOG_LEVEL
#define TERMINAL_LOG_LEVEL 3
#endif

void logPrintf(char level, const char* tag, const char* format, ...) __attribute__((format(printf, 3, 4)));

#define LOGE(tag, format, ...)                                               \
  do {                                                                       \
    if (TERMINAL_LOG_LEVEL >= 1) logPrintf('E', tag, format, ##__VA_ARGS__); \
  } while (0)
#define LOGW(tag, format, ...)                                               \
  do {                                                                       \
    if (TERMINAL_LOG_LEVEL >= 2) logPrintf('W', tag, format, ##__VA_ARGS__); \
  } while (0)
#define LOGI(tag, format, ...)                                               \
  do {                                                                       \
    if (TERMINAL_LOG_LEVEL >= 3) logPrintf('I', tag, format, ##__VA_ARGS__); \
  } while (0)
#define LOGD(tag, format, ...)                                               \
  do {                                                                       \
    if (TERMINAL_LOG_LEVEL >= 4) logPrintf('D', tag, format, ##__VA_ARGS__); \
  } while (0)
