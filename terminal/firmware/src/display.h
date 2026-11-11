#pragma once
#include <stdint.h>

// OLED of the terminal: SH1106 128x64 on I2C (checked on the bench, I01). Each call redraws the whole
// screen and sends it over I2C, so the caller redraws only when something visible changes. Texts follow
// the guide, section 6.1: ASCII, at most 20 characters. Only loop() uses it.
void displayBegin();

// A title in the middle of the screen, with a smaller detail line under it: the network status, a result
// ("ACESSO LIBERADO", "ACESSO NEGADO" and the reason) or a tag that was read.
void displayStatus(const char* title, const char* detail);

// The QR on the left square (lit background, dark modules) and, on the right, the terminal label, the
// seconds until the next QR and "Leia com o app" (guide, I06). Returns false, drawing nothing, when the
// payload does not make a version 2 QR with modules of at least 2 px.
bool displayQr(const char* payload, const char* label, uint32_t secondsLeft);
