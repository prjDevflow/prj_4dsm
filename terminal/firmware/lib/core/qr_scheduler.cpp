#include "qr_scheduler.h"

namespace {
constexpr uint32_t kRejectedWaitMs = 60000;

// Whether nowMs is at or after instantMs, on a clock that wraps every 49 days.
bool reached(uint32_t nowMs, uint32_t instantMs) { return static_cast<int32_t>(nowMs - instantMs) >= 0; }

// The later of two instants less than 24 days apart.
uint32_t later(uint32_t a, uint32_t b) { return reached(a, b) ? a : b; }
}  // namespace

QrScheduler::QrScheduler(uint32_t minIntervalMs, uint32_t maxBackoffMs)
    : minIntervalMs_(minIntervalMs), backoff_(minIntervalMs, maxBackoffMs) {}

bool QrScheduler::due(uint32_t nowMs) const { return !started_ || reached(nowMs, nextRequestMs_); }

void QrScheduler::requestStarted(uint32_t nowMs) {
  started_ = true;
  lastStartMs_ = nowMs;
  nextRequestMs_ = nowMs + minIntervalMs_;  // until an answer comes, nothing goes out before the minimum
}

void QrScheduler::succeeded(uint32_t validityMs, uint32_t refreshMs) {
  backoff_.reset();
  hasQr_ = true;
  qrValidUntilMs_ = lastStartMs_ + validityMs;
  nextRequestMs_ = lastStartMs_ + (refreshMs > minIntervalMs_ ? refreshMs : minIntervalMs_);
}

void QrScheduler::failed(uint32_t nowMs, uint32_t waitMs) {
  const uint32_t waitForMs = waitMs > 0 ? waitMs : backoff_.nextDelayMs();
  nextRequestMs_ = later(nowMs + waitForMs, lastStartMs_ + minIntervalMs_);
}

void QrScheduler::rejected(uint32_t nowMs) {
  nextRequestMs_ = later(nowMs + kRejectedWaitMs, lastStartMs_ + minIntervalMs_);
}

bool QrScheduler::qrValid(uint32_t nowMs) {
  if (hasQr_ && static_cast<int32_t>(nowMs - qrValidUntilMs_) > 0) hasQr_ = false;
  return hasQr_;
}

uint32_t QrScheduler::secondsToNextRequest(uint32_t nowMs) const {
  if (due(nowMs)) return 0;
  return (nextRequestMs_ - nowMs + 999) / 1000;
}
