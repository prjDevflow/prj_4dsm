#pragma once

// Largest whole number of pixels per QR module that fits a square area, and the margin that centers the
// code (guide, I06). On the 64 px square of the OLED, version 2 (25 modules) gets 2 px and 7 px of margin.
struct QrLayout {
  int modulePx;
  int offsetPx;
};

// With 1 px per module the phones cannot read the code: the firmware does not draw it.
constexpr int kMinQrModulePx = 2;

QrLayout layoutQr(int areaPx, int modules);
