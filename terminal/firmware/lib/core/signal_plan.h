#pragma once
#include <stdint.h>

// What the buzzer and the turnstile do after each event (guide, I07 "Padroes de sinal", without the LEDs,
// which are not part of this assembly). Pure: the caller passes the time and applies the outputs to the pins.
//
// | Event   | Buzzer                             | Turnstile                                          |
// |---------|------------------------------------|----------------------------------------------------|
// | Granted | one 300 ms beep                    | open for openMs; a new Granted extends, never cuts |
// | Denied  | three 150 ms beeps, 150 ms apart   | untouched: it never closes an opening (B15)        |
// | TagRead | one 80 ms beep                     | untouched                                          |
// | Enrolled| two 100 ms beeps, 100 ms apart     | untouched (enrollment mode of the admin, I11)      |
//
// A new event replaces the beeps in progress.
enum class SignalEvent : uint8_t { Granted, Denied, TagRead, Enrolled };

struct SignalOutputs {
  bool buzzerOn;
  bool turnstileOpen;
};

class SignalPlan {
 public:
  void start(SignalEvent event, uint32_t nowMs, uint32_t openMs = 0);

  // What the outputs must be now. Call it on every loop() pass: finished beeps and openings are dropped for
  // good, so they cannot come back when millis() wraps.
  SignalOutputs update(uint32_t nowMs);

 private:
  void setBeeps(uint8_t count, uint16_t onMs, uint16_t offMs, uint32_t nowMs);

  uint32_t beepStartMs_ = 0;
  uint8_t beepCount_ = 0;
  uint16_t beepOnMs_ = 0;
  uint16_t beepOffMs_ = 0;
  bool open_ = false;
  uint32_t openUntilMs_ = 0;
};
