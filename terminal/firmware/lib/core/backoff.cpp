#include "backoff.h"

namespace {
// A zero minimum would never grow (0 * 2 = 0).
uint32_t atLeastOne(uint32_t value) { return value == 0 ? 1 : value; }
}  // namespace

Backoff::Backoff(uint32_t minMs, uint32_t maxMs)
    : minMs_(atLeastOne(minMs)), maxMs_(maxMs < minMs_ ? minMs_ : maxMs), currentMs_(minMs_) {}

uint32_t Backoff::nextDelayMs() {
  const uint32_t delayMs = currentMs_;
  // Compare before doubling, so the multiplication never overflows.
  currentMs_ = currentMs_ >= maxMs_ / 2 ? maxMs_ : currentMs_ * 2;
  return delayMs;
}

uint32_t Backoff::peekDelayMs() const { return currentMs_; }

void Backoff::reset() { currentMs_ = minMs_; }
