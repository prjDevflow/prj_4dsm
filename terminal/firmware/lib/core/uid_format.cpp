#include "uid_format.h"

namespace {
const char kHexDigits[] = "0123456789ABCDEF";
}  // namespace

bool formatUid(const uint8_t* bytes, size_t size, char* out, size_t outSize) {
  if (out == nullptr || outSize == 0) return false;
  out[0] = '\0';
  if (bytes == nullptr || (size != 4 && size != 7 && size != 10) || outSize < size * 2 + 1) return false;
  for (size_t i = 0; i < size; ++i) {
    out[2 * i] = kHexDigits[bytes[i] >> 4];
    out[2 * i + 1] = kHexDigits[bytes[i] & 0x0F];
  }
  out[size * 2] = '\0';
  return true;
}
