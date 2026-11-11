#pragma once
#include <stdint.h>

#include "uid_format.h"

// One reading per approach of a tag (guide, I10; NFC_DEBOUNCE_SECONDS of the contract). The same UID seen
// again less than windowMs after it was last seen is ignored, and every sighting restarts the window: a tag
// resting on the reader gives a single reading. A different UID passes at once.
class UidDebounce {
 public:
  explicit UidDebounce(uint32_t windowMs = 3000);

  bool accept(const char* uid, uint32_t nowMs);

 private:
  uint32_t windowMs_;
  bool hasLast_ = false;
  char lastUid_[kMaxUidTextLength + 1] = {};
  uint32_t lastSeenMs_ = 0;
};
