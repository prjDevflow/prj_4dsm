#pragma once
// Single source of truth for pin numbers: no pin number appears outside this file.
// Wiring: the pin map of the firmware report, copied to terminal/docs/pinagem.md.
// Board: ESP32 DevKit V1 (30 pins). Follow the name printed on the board, not the position.
// Free: GPIO 25 and 26 (they were the LEDs). If a wire has to move, avoid 6-11 (flash),
// 34-39 (input only) and 0, 2, 12, 15 (boot mode).

#include <stdint.h>

// RC522 (NFC) on the VSPI bus, on the +3V3 rail: 5 V destroys the module. IRQ is not connected (polling).
constexpr uint8_t PIN_RC522_SS = 5;  // SDA/SS. Boot strapping pin: never pull it to GND at power-up.
constexpr uint8_t PIN_RC522_SCK = 18;
constexpr uint8_t PIN_RC522_MOSI = 23;
constexpr uint8_t PIN_RC522_MISO = 19;
constexpr uint8_t PIN_RC522_RST = 4;

// OLED 128x64 on I2C, on the +3V3 rail: 0.96" SSD1306 or 1.3" SH1106 (guide, question 1).
constexpr uint8_t PIN_OLED_SDA = 21;
constexpr uint8_t PIN_OLED_SCL = 22;
constexpr uint8_t OLED_I2C_ADDRESS = 0x3C;  // 7-bit address; U8g2 expects it shifted left (0x78)

// GPS NEO-6M on UART2, on the +3V3 rail. GPS TX -> ESP32 RX2 and GPS RX -> ESP32 TX2.
constexpr uint8_t PIN_GPS_RX = 16;  // the ESP32 receives here (GPS TX)
constexpr uint8_t PIN_GPS_TX = 17;  // the ESP32 transmits here (GPS RX)
constexpr uint32_t GPS_BAUD = 9600;

// SG90 servo (turnstile), PWM 50 Hz. Only the signal comes from the ESP32: power from the +5V rail (VIN),
// never 3V3. The 470 uF capacitor on the +5V rail holds the voltage when the servo starts.
constexpr uint8_t PIN_SERVO = 13;

// Buzzer (+), with (-) on GND. Plain on/off if active; a PWM tone only if passive (guide, question 8).
constexpr uint8_t PIN_BUZZER = 27;

// On-board blue LED of the DevKit: not a wire of the map, it only shows the loop is alive.
constexpr uint8_t PIN_LED_BUILTIN = 2;
