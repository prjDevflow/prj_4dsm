#include "http_result.h"

HttpResult classifyHttpStatus(int status) {
  if (status >= 200 && status < 300) return HttpResult::Ok;
  if (status == 401) return HttpResult::Unauthorized;
  if (status == 403) return HttpResult::Forbidden;
  if (status == 422) return HttpResult::Unprocessable;
  if (status == 429) return HttpResult::RateLimited;
  if (status >= 400 && status < 500) return HttpResult::ClientError;
  return HttpResult::ServerError;
}

uint32_t parseRetryAfterMs(const char* header) {
  constexpr uint32_t kMaxSeconds = 3600;
  if (header == nullptr || *header == '\0') return 0;
  uint32_t seconds = 0;
  for (const char* p = header; *p != '\0'; ++p) {
    if (*p < '0' || *p > '9') return 0;
    seconds = seconds * 10 + static_cast<uint32_t>(*p - '0');
    if (seconds > kMaxSeconds) seconds = kMaxSeconds;  // capping on the way keeps the sum from overflowing
  }
  return seconds * 1000;
}
