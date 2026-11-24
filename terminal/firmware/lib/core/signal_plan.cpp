#include "signal_plan.h"

void SignalPlan::start(SignalEvent event, uint32_t nowMs, uint32_t openMs) {
  switch (event) {
    case SignalEvent::Granted: {
      setBeeps(1, 300, 0, nowMs);
      const uint32_t untilMs = nowMs + openMs;
      // Extends from this command, but a shorter one never cuts an opening in progress.
      if (!open_ || static_cast<int32_t>(untilMs - openUntilMs_) > 0) openUntilMs_ = untilMs;
      open_ = true;
      break;
    }
    case SignalEvent::Denied:
      setBeeps(3, 150, 150, nowMs);
      break;
    case SignalEvent::TagRead:
      setBeeps(1, 80, 0, nowMs);
      break;
    case SignalEvent::Enrolled:
      setBeeps(2, 100, 100, nowMs);
      break;
  }
}

SignalOutputs SignalPlan::update(uint32_t nowMs) {
  SignalOutputs outputs{false, false};
  if (beepCount_ > 0) {
    const uint32_t periodMs = static_cast<uint32_t>(beepOnMs_) + beepOffMs_;
    const uint32_t totalMs = periodMs * beepCount_ - beepOffMs_;
    const uint32_t elapsedMs = nowMs - beepStartMs_;
    if (elapsedMs >= totalMs) {
      beepCount_ = 0;
    } else {
      outputs.buzzerOn = elapsedMs % periodMs < beepOnMs_;
    }
  }
  if (open_) {
    if (static_cast<int32_t>(nowMs - openUntilMs_) >= 0) {
      open_ = false;
    } else {
      outputs.turnstileOpen = true;
    }
  }
  return outputs;
}

void SignalPlan::setBeeps(uint8_t count, uint16_t onMs, uint16_t offMs, uint32_t nowMs) {
  beepStartMs_ = nowMs;
  beepCount_ = count;
  beepOnMs_ = onMs;
  beepOffMs_ = offMs;
}
