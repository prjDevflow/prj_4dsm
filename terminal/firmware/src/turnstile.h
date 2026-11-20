#pragma once
#include <stdint.h>

// Turnstile servo (SG90 or MG90S on GPIO 13, power from VIN). Only loop() uses it.

// Safe state (guide, section 4 and I07): the turnstile closes at power-up, even if the power went away with
// it open. Blocks for half a second: call it first thing in setup(), before Wi-Fi also draws current.
void turnstileCloseAtBoot();

// Opens (90 degrees) or closes (0 degrees) as signal_plan says, without blocking. Half a second after
// closing the PWM stops (no jitter, less current) until the next opening.
void turnstileApply(bool open, uint32_t nowMs);
