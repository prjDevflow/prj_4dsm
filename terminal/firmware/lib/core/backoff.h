#pragma once
#include <stdint.h>

// Growing wait between retries: starts at minMs, doubles on every failure, never goes above maxMs,
// and a success brings it back to minMs. Pure logic: it does not read the clock, the caller waits.
//
// Default (1 s up to 30 s) is the guide's network rule (section 6). Routes with a backend rate limit
// use that limit as the minimum, e.g. Backoff(5000) for the QR (1 every 5 s).
class Backoff {
 public:
  explicit Backoff(uint32_t minMs = 1000, uint32_t maxMs = 30000);

  // Delay to wait after a failure. The next call returns the doubled value, capped at maxMs.
  uint32_t nextDelayMs();

  // What the next failure will return, without advancing.
  uint32_t peekDelayMs() const;

  // After a success: the next failure starts again at minMs.
  void reset();

 private:
  uint32_t minMs_;
  uint32_t maxMs_;
  uint32_t currentMs_;
};
