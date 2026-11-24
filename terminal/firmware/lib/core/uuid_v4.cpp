#include "uuid_v4.h"

namespace {
const char kHexDigits[] = "0123456789abcdef";
}  // namespace

bool formatUuidV4(const uint8_t random[16], char* out, size_t outSize) {
  if (out == nullptr || outSize == 0) return false;
  out[0] = '\0';
  if (random == nullptr || outSize < kUuidLength + 1) return false;

  uint8_t bytes[16];
  for (int i = 0; i < 16; ++i) bytes[i] = random[i];
  bytes[6] = static_cast<uint8_t>((bytes[6] & 0x0F) | 0x40);  // version 4
  bytes[8] = static_cast<uint8_t>((bytes[8] & 0x3F) | 0x80);  // variant 10xx (RFC 4122)

  size_t position = 0;
  for (int i = 0; i < 16; ++i) {
    if (i == 4 || i == 6 || i == 8 || i == 10) out[position++] = '-';
    out[position++] = kHexDigits[bytes[i] >> 4];
    out[position++] = kHexDigits[bytes[i] & 0x0F];
  }
  out[position] = '\0';
  return true;
}
