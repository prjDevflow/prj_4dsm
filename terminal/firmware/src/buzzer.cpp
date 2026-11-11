#include "buzzer.h"

#include <Arduino.h>

#include "pins.h"

namespace {
constexpr uint8_t kChannel = 7;  // LEDC channel away from the first ones ESP32Servo takes
constexpr uint8_t kResolutionBits = 8;
constexpr uint32_t kToneHz = 2700;

bool sounding = false;
}  // namespace

void buzzerBegin() {
  ledcSetup(kChannel, kToneHz, kResolutionBits);
  ledcAttachPin(PIN_BUZZER, kChannel);
  ledcWriteTone(kChannel, 0);
  sounding = false;
}

void buzzerApply(bool on) {
  if (on == sounding) return;
  ledcWriteTone(kChannel, on ? kToneHz : 0);
  sounding = on;
}
