#pragma once
#include <stdint.h>

#include "backoff.h"

// When to ask the backend for a QR, and until when the last one may stay on the screen (guide, I06).
// Times come from the caller (millis()); every comparison survives the 49-day wrap of uint32_t.
//
// - The next request goes out renovarEmMs after the previous one left, and never sooner than minIntervalMs
//   after it: the backend refuses a second QR within 5 s with 429.
// - After a failure it waits Retry-After or the growing delay (5, 10, 20, 30 s), again never below the
//   minimum; a 401 or 403 waits a minute (guide, section 6).
// - A QR may be shown until requestStart + validity. The backend issues it after the request leaves, so
//   this deadline is never later than its expiraEm: the screen never shows an expired QR.
class QrScheduler {
 public:
  explicit QrScheduler(uint32_t minIntervalMs = 5000, uint32_t maxBackoffMs = 30000);

  bool due(uint32_t nowMs) const;
  void requestStarted(uint32_t nowMs);
  void succeeded(uint32_t validityMs, uint32_t refreshMs);
  void failed(uint32_t nowMs, uint32_t waitMs);  // waitMs 0: the growing delay
  void rejected(uint32_t nowMs);                 // 401 or 403

  // Whether the last QR may still be shown. Call it regularly: an expired QR is dropped for good, so it
  // cannot come back when millis() wraps.
  bool qrValid(uint32_t nowMs);
  uint32_t qrValidUntilMs() const { return qrValidUntilMs_; }

  uint32_t nextRequestMs() const { return nextRequestMs_; }
  uint32_t secondsToNextRequest(uint32_t nowMs) const;  // the countdown next to the QR

 private:
  uint32_t minIntervalMs_;
  Backoff backoff_;
  bool started_ = false;
  uint32_t lastStartMs_ = 0;
  uint32_t nextRequestMs_ = 0;
  bool hasQr_ = false;
  uint32_t qrValidUntilMs_ = 0;
};
