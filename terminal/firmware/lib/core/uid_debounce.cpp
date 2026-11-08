#include "uid_debounce.h"

#include <string.h>

UidDebounce::UidDebounce(uint32_t windowMs) : windowMs_(windowMs) {}

bool UidDebounce::accept(const char* uid, uint32_t nowMs) {
  if (uid == nullptr) return false;
  const bool sameTag = hasLast_ && strcmp(uid, lastUid_) == 0;
  const bool accepted = !sameTag || nowMs - lastSeenMs_ >= windowMs_;

  size_t i = 0;
  for (; i < kMaxUidTextLength && uid[i] != '\0'; ++i) lastUid_[i] = uid[i];
  lastUid_[i] = '\0';
  lastSeenMs_ = nowMs;
  hasLast_ = true;
  return accepted;
}
