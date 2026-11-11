#pragma once
#include <Arduino.h>

#include "http_result.h"

// Answer of one call to the backend.
struct ApiResponse {
  HttpResult result = HttpResult::NetworkError;
  int status = 0;             // HTTP status, or the negative HTTPClient error code
  uint32_t retryAfterMs = 0;  // only on 429
  String body;
};

// HTTP calls to the backend (guide, I04 and section 6): base URL from secrets.h, X-Terminal-Id and
// X-Terminal-Key on every call, 5 s to connect and 5 s to read, so no call holds the caller for more than
// 10 s. Blocking: use it only from the network task, never from loop().
class ApiClient {
 public:
  ApiClient(const char* baseUrl, const char* terminalId, const char* terminalKey);

  ApiResponse get(const char* path);
  // idempotencyKey goes as the Idempotency-Key header when given (POST /terminal/nfc).
  ApiResponse post(const char* path, const char* jsonBody = nullptr, const char* idempotencyKey = nullptr);

 private:
  ApiResponse send(const char* method, const char* path, const char* body, const char* idempotencyKey);

  const char* baseUrl_;
  const char* terminalId_;
  const char* terminalKey_;
};
