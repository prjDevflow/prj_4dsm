#include "api_client.h"

#include <HTTPClient.h>
#include <WiFiClient.h>

namespace {
constexpr int32_t kConnectTimeoutMs = 5000;
constexpr uint16_t kReadTimeoutMs = 5000;
const char* kCollectedHeaders[] = {"Retry-After"};
}  // namespace

ApiClient::ApiClient(const char* baseUrl, const char* terminalId, const char* terminalKey)
    : baseUrl_(baseUrl), terminalId_(terminalId), terminalKey_(terminalKey) {}

ApiResponse ApiClient::get(const char* path) { return send("GET", path, nullptr, nullptr); }

ApiResponse ApiClient::post(const char* path, const char* jsonBody, const char* idempotencyKey) {
  return send("POST", path, jsonBody, idempotencyKey);
}

ApiResponse ApiClient::send(const char* method, const char* path, const char* body, const char* idempotencyKey) {
  ApiResponse response;
  WiFiClient client;
  HTTPClient http;
  http.setConnectTimeout(kConnectTimeoutMs);
  http.setTimeout(kReadTimeoutMs);
  http.setReuse(false);
  if (!http.begin(client, String(baseUrl_) + path)) {
    response.status = HTTPC_ERROR_CONNECTION_REFUSED;  // the URL could not even be parsed
    return response;
  }
  http.addHeader("X-Terminal-Id", terminalId_);
  http.addHeader("X-Terminal-Key", terminalKey_);
  http.addHeader("Content-Type", "application/json");
  if (idempotencyKey != nullptr) http.addHeader("Idempotency-Key", idempotencyKey);
  http.collectHeaders(kCollectedHeaders, 1);

  uint8_t* payload = reinterpret_cast<uint8_t*>(const_cast<char*>(body));
  response.status = http.sendRequest(method, payload, body == nullptr ? 0 : strlen(body));
  if (response.status < 0) {
    response.result =
        response.status == HTTPC_ERROR_READ_TIMEOUT ? HttpResult::Timeout : HttpResult::NetworkError;
  } else {
    response.result = classifyHttpStatus(response.status);
    if (response.result == HttpResult::RateLimited) {
      response.retryAfterMs = parseRetryAfterMs(http.header("Retry-After").c_str());
    }
    response.body = http.getString();
  }
  http.end();
  return response;
}
