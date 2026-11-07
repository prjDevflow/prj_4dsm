// Access terminal firmware (ESP32 DevKit V1).
// I03: project skeleton, serial log with levels and Wi-Fi that reconnects by itself.
// The network calls (I04 onwards), the signals and the servo (I07) come in the next stages.

#include <Arduino.h>

#include "firmware_version.h"
#include "log.h"
#include "pins.h"
#include "reset_reason.h"
#include "secret_mask.h"
#include "secrets.h"
#include "wifi_manager.h"

namespace {
constexpr uint32_t kBlinkPeriodMs = 500;

WifiManager wifi(WIFI_SSID, WIFI_PASSWORD);
uint32_t lastBlinkMs = 0;
bool builtinLedOn = false;

// Safe state at power-up (guide, section 4): every signal off. The servo joins in the I07.
void setOutputsOff() {
  const uint8_t outputs[] = {PIN_BUZZER, PIN_LED_BUILTIN};
  for (uint8_t pin : outputs) {
    pinMode(pin, OUTPUT);
    digitalWrite(pin, LOW);
  }
}
}  // namespace

void setup() {
  setOutputsOff();
  Serial.begin(115200);

  char maskedKey[16];
  LOGI("boot", "%s, firmware %s, ultimo reinicio: %s", TERMINAL_LABEL, FIRMWARE_VERSION,
       resetReasonText(esp_reset_reason()));
  LOGI("boot", "id %s, chave %s, API %s", TERMINAL_ID, maskSecret(TERMINAL_KEY, maskedKey, sizeof maskedKey),
       API_BASE_URL);

  wifi.begin(millis());
}

void loop() {
  const uint32_t now = millis();
  wifi.tick(now);

  // The on-board LED blinks while the loop runs; it must keep blinking during network calls (I04).
  if (now - lastBlinkMs >= kBlinkPeriodMs) {
    lastBlinkMs = now;
    builtinLedOn = !builtinLedOn;
    digitalWrite(PIN_LED_BUILTIN, builtinLedOn ? HIGH : LOW);
  }

  delay(5);  // short on purpose: the loop never blocks for long
}
