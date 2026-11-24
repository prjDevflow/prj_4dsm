#pragma once

// Passive buzzer (checked on the bench, I01): it only sounds with a PWM tone. Only loop() uses it.
void buzzerBegin();

// Tone on or off; touches the PWM only when the state changes. The rhythm comes from signal_plan (I07).
void buzzerApply(bool on);
