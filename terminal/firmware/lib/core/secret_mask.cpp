#include "secret_mask.h"

#include <string.h>

namespace {
void copyTruncated(const char* source, char* out, size_t outSize) {
  size_t i = 0;
  for (; i + 1 < outSize && source[i] != '\0'; ++i) out[i] = source[i];
  out[i] = '\0';
}
}  // namespace

char* maskSecret(const char* secret, char* out, size_t outSize) {
  if (out == nullptr || outSize == 0) return out;

  const size_t length = secret == nullptr ? 0 : strlen(secret);
  if (length == 0) {
    copyTruncated("(vazia)", out, outSize);
    return out;
  }

  char masked[9] = "****";
  if (length > 8) {
    memcpy(masked + 4, secret + length - 4, 4);
    masked[8] = '\0';
  }
  copyTruncated(masked, out, outSize);
  return out;
}
