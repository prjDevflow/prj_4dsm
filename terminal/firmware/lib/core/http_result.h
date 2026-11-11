#pragma once
#include <stdint.h>

// What a terminal route answered, as the firmware acts on it (guide, I04 and section 6). Failures without
// an HTTP status (no connection, no answer in time) are set by the HTTP adapter as NetworkError or Timeout.
enum class HttpResult : uint8_t {
  Ok,             // 2xx
  NetworkError,   // no connection, DNS, socket closed
  Timeout,        // no answer in time
  Unauthorized,   // 401: wrong key; try again only once a minute
  Forbidden,      // 403: terminal disabled; try again once a minute
  Unprocessable,  // 422: body out of the contract (a firmware bug); never resend the same body
  RateLimited,    // 429: wait Retry-After or the growing delay
  ServerError,    // 5xx, or a status the terminal cannot use (1xx, 3xx)
  ClientError,    // any other 4xx (404, 409...)
};

HttpResult classifyHttpStatus(int status);

// Retry-After in seconds (the only form the backend sends) as milliseconds, capped at one hour. 0 when the
// header is missing or not a plain number, so the caller falls back to its growing delay.
uint32_t parseRetryAfterMs(const char* header);
