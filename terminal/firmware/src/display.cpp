#include "display.h"

#include <U8g2lib.h>
#include <qrcode.h>
#include <stdio.h>

#include "pins.h"
#include "qr_layout.h"
#include "screen_text.h"

namespace {
constexpr uint8_t kQrVersion = 2;  // 25 x 25 modules: the 27 characters of the payload fit with correction L
constexpr int kQrModules = 4 * kQrVersion + 17;
constexpr int kQrAreaPx = 64;  // left square, the full height of the screen
constexpr int kTextX = 68;     // right column, 60 px wide
constexpr int kScreenWidth = 128;

U8G2_SH1106_128X64_NONAME_F_HW_I2C oled(U8G2_R0, U8X8_PIN_NONE, PIN_OLED_SCL, PIN_OLED_SDA);

void drawCentered(const char* text, int baselineY) {
  oled.drawStr((kScreenWidth - oled.getStrWidth(text)) / 2, baselineY, text);
}
}  // namespace

void displayBegin() {
  oled.setI2CAddress(OLED_I2C_ADDRESS * 2);
  oled.setBusClock(400000);
  oled.begin();
}

void displayStatus(const char* title, const char* detail) {
  oled.clearBuffer();
  oled.setFont(u8g2_font_6x13B_tr);
  drawCentered(title, 30);
  oled.setFont(u8g2_font_6x10_tr);
  drawCentered(detail, 50);
  oled.sendBuffer();
}

bool displayQr(const char* payload, const char* label, uint32_t secondsLeft) {
  QRCode qr;
  uint8_t modules[(kQrModules * kQrModules + 7) / 8];
  if (qrcode_initText(&qr, modules, kQrVersion, ECC_LOW, payload) != 0) return false;
  const QrLayout layout = layoutQr(kQrAreaPx, qr.size);
  if (layout.modulePx < kMinQrModulePx) return false;

  oled.clearBuffer();
  oled.setDrawColor(1);
  oled.drawBox(0, 0, kQrAreaPx, kQrAreaPx);  // lit square: the phones read dark modules on a light background
  oled.setDrawColor(0);
  for (uint8_t y = 0; y < qr.size; ++y) {
    for (uint8_t x = 0; x < qr.size; ++x) {
      if (qrcode_getModule(&qr, x, y)) {
        oled.drawBox(layout.offsetPx + x * layout.modulePx, layout.offsetPx + y * layout.modulePx,
                     layout.modulePx, layout.modulePx);
      }
    }
  }
  oled.setDrawColor(1);

  char seconds[12];
  snprintf(seconds, sizeof seconds, "%lu s", static_cast<unsigned long>(secondsLeft));
  oled.setFont(u8g2_font_5x7_tr);
  oled.drawStr(kTextX, 8, label);
  oled.setFont(u8g2_font_9x15B_tr);
  oled.drawStr(kTextX, 34, seconds);
  oled.setFont(u8g2_font_5x7_tr);
  oled.drawStr(kTextX, 54, screen::kReadWithApp1);
  oled.drawStr(kTextX, 63, screen::kReadWithApp2);
  oled.sendBuffer();
  return true;
}
