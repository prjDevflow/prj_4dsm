#pragma once
// Single source of truth for pin numbers (guide, table 2.1): no pin number appears outside this file.
// Board: ESP32 DevKit V1 (30 pins). Follow the name printed on the board, not the position.

#include <stdint.h>

// RC522 (NFC) on the VSPI bus. 3.3 V only: 5 V destroys the module. IRQ is not connected (polling).
constexpr uint8_t PIN_RC522_SS = 5;  // SDA/SS. Boot strapping pin: never pull it to GND at power-up.
constexpr uint8_t PIN_RC522_SCK = 18;
constexpr uint8_t PIN_RC522_MOSI = 23;
constexpr uint8_t PIN_RC522_MISO = 19;
constexpr uint8_t PIN_RC522_RST = 4;

// OLED 128x64 on I2C: 0.96" SSD1306 or 1.3" SH1106 (guide, question 1).
constexpr uint8_t PIN_OLED_SDA = 21;
constexpr uint8_t PIN_OLED_SCL = 22;
constexpr uint8_t OLED_I2C_ADDRESS = 0x3C;  // 7-bit address; U8g2 expects it shifted left (0x78)

// GPS NEO-6M on UART2. GPS TX -> ESP32 RX2 and GPS RX -> ESP32 TX2.
constexpr uint8_t PIN_GPS_RX = 16;  // the ESP32 receives here (GPS TX)
constexpr uint8_t PIN_GPS_TX = 17;  // the ESP32 transmits here (GPS RX)
constexpr uint32_t GPS_BAUD = 9600;

// SG90 servo (turnstile). Only the signal comes from the ESP32: power from the +5 V rail (VIN), never 3V3.
constexpr uint8_t PIN_SERVO = 13;

// Signals.
constexpr uint8_t PIN_LED_GREEN = 25;  // through 220 ohm
constexpr uint8_t PIN_LED_RED = 26;    // through 220 ohm
constexpr uint8_t PIN_BUZZER = 27;     // active or passive: guide, question 8

// On-board blue LED of the DevKit (not in table 2.1): shows the loop is alive.
constexpr uint8_t PIN_LED_BUILTIN = 2;
