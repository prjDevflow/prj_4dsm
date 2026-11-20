#include "turnstile.h"

#include <Arduino.h>
#include <ESP32Servo.h>

#include "log.h"
#include "pins.h"

namespace {
constexpr int kClosedDegrees = 0;
constexpr int kOpenDegrees = 90;
constexpr uint32_t kSettleMs = 500;  // enough for a full sweep of the SG90

Servo servo;
bool isOpen = false;
bool releasing = false;
uint32_t releaseAtMs = 0;

void attachServo() {
  if (servo.attached()) return;
  servo.setPeriodHertz(50);
  servo.attach(PIN_SERVO, 500, 2400);
}
}  // namespace

void turnstileCloseAtBoot() {
  attachServo();
  servo.write(kClosedDegrees);
  delay(kSettleMs);
  servo.detach();
}

void turnstileApply(bool open, uint32_t nowMs) {
  if (open && !isOpen) {
    attachServo();
    servo.write(kOpenDegrees);
    isOpen = true;
    releasing = false;
    LOGI("catraca", "aberta");
  } else if (!open && isOpen) {
    servo.write(kClosedDegrees);
    isOpen = false;
    releasing = true;
    releaseAtMs = nowMs + kSettleMs;
    LOGI("catraca", "fechada");
  }
  if (releasing && static_cast<int32_t>(nowMs - releaseAtMs) >= 0) {
    servo.detach();
    releasing = false;
  }
}
