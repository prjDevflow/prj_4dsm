#include "qr_payload.h"

#include <string.h>

namespace {
const char kPrefix[] = "ACS1:";
constexpr size_t kPrefixLength = sizeof kPrefix - 1;

bool isBase64Url(char c) {
  return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-' || c == '_';
}
}  // namespace

bool isValidQrPayload(const char* payload) {
  if (payload == nullptr || strncmp(payload, kPrefix, kPrefixLength) != 0) return false;
  size_t length = kPrefixLength;
  for (const char* p = payload + kPrefixLength; *p != '\0'; ++p, ++length) {
    if (length >= kQrPayloadLength || !isBase64Url(*p)) return false;
  }
  return length == kQrPayloadLength;
}
