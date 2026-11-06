// Bench tool for the I01: tests each part of the terminal on its own, from a menu on the serial monitor.
//   pio run -e bancada -t upload
//   pio device monitor -e bancada
// Uses only the pins from pins.h. Each test takes a few seconds and then shows the menu again.

#include <Arduino.h>
#include <ESP32Servo.h>
#include <MFRC522.h>
#include <SPI.h>
#include <U8g2lib.h>
#include <Wire.h>
#include <qrcode.h>

#include "pins.h"
#include "reset_reason.h"

namespace {

// Example payload of the contract (backend doc 03, section 4.3): same length as a real QR.
const char kTestPayload[] = "ACS1:q3F8k2Zr1pLw9XbTn0YhVA";
constexpr uint8_t kQrVersion = 2;  // fixed: 25 x 25 modules (guide, I06)
constexpr int kQrModules = 4 * kQrVersion + 17;
constexpr int kQrModulePx = 2;
constexpr uint8_t kBuzzerToneChannel = 7;  // LEDC channel away from the first ones ESP32Servo takes

U8G2_SSD1306_128X64_NONAME_F_HW_I2C oledSsd1306(U8G2_R0, U8X8_PIN_NONE, PIN_OLED_SCL, PIN_OLED_SDA);
U8G2_SH1106_128X64_NONAME_F_HW_I2C oledSh1106(U8G2_R0, U8X8_PIN_NONE, PIN_OLED_SCL, PIN_OLED_SDA);
U8G2* oled = nullptr;  // driver chosen with option 2 or 3
MFRC522 rfid(PIN_RC522_SS, PIN_RC522_RST);
Servo servo;

void printMenu() {
  Serial.println();
  Serial.println("=== Bancada do terminal (I01) ===");
  Serial.println(" 1  I2C: procurar o OLED");
  Serial.println(" 2  OLED com o driver SSD1306 (0,96\")");
  Serial.println(" 3  OLED com o driver SH1106 (1,3\")");
  Serial.println(" 4  QR de teste no OLED (escolha o driver antes)");
  Serial.println(" 5  RC522: versao do chip e leitura de tags (10 s)");
  Serial.println(" 6  GPS: sentencas NMEA por 15 s");
  Serial.println(" 7  Servo: 0, 90 e 0 graus");
  Serial.println(" 8  LEDs: verde e vermelho");
  Serial.println(" 9  Buzzer: ativo ou passivo?");
  Serial.print("Opcao: ");
}

void scanI2c() {
  Wire.begin(PIN_OLED_SDA, PIN_OLED_SCL);
  int found = 0;
  for (uint8_t address = 1; address < 127; ++address) {
    Wire.beginTransmission(address);
    if (Wire.endTransmission() == 0) {
      Serial.printf("  encontrado: 0x%02X%s\n", address,
                    address == OLED_I2C_ADDRESS ? " (endereco esperado do OLED)" : "");
      ++found;
    }
  }
  if (found == 0) Serial.println("  nada encontrado: confira SDA no GPIO 21, SCL no GPIO 22, 3V3 e GND");
}

void showOledPattern(U8G2& display, const char* driverName) {
  display.setI2CAddress(OLED_I2C_ADDRESS * 2);
  display.begin();
  display.clearBuffer();
  display.drawFrame(0, 0, 128, 64);
  display.setFont(u8g2_font_6x10_tr);
  display.drawStr(6, 14, driverName);
  display.drawStr(6, 30, "Moldura inteira e");
  display.drawStr(6, 42, "texto limpo: este");
  display.drawStr(6, 54, "e o driver certo");
  display.sendBuffer();
  oled = &display;
  Serial.printf("  desenhado com o driver %s.\n", driverName);
  Serial.println("  Moldura inteira e texto limpo: driver certo. Lixo numa borda ou imagem deslocada: teste o outro.");
}

void showTestQr() {
  if (oled == nullptr) {
    Serial.println("  escolha antes o driver do OLED (opcao 2 ou 3)");
    return;
  }
  QRCode qr;
  uint8_t modules[(kQrModules * kQrModules + 7) / 8];
  if (qrcode_initText(&qr, modules, kQrVersion, ECC_LOW, kTestPayload) != 0) {
    Serial.println("  nao foi possivel gerar o QR");
    return;
  }

  const int offset = (64 - qr.size * kQrModulePx) / 2;  // 25 modules x 2 px = 50 px, 7 px of white margin
  oled->clearBuffer();
  oled->setDrawColor(1);
  oled->drawBox(0, 0, 64, 64);  // lit square: modules are drawn dark on a light background
  oled->setDrawColor(0);
  for (uint8_t y = 0; y < qr.size; ++y) {
    for (uint8_t x = 0; x < qr.size; ++x) {
      if (qrcode_getModule(&qr, x, y)) {
        oled->drawBox(offset + x * kQrModulePx, offset + y * kQrModulePx, kQrModulePx, kQrModulePx);
      }
    }
  }
  oled->setDrawColor(1);
  oled->setFont(u8g2_font_5x7_tr);
  oled->drawStr(68, 10, "QR de teste");
  oled->drawStr(68, 20, "versao 2");
  oled->drawStr(68, 30, "2 px/modulo");
  oled->drawStr(68, 52, "Leia com o");
  oled->drawStr(68, 62, "celular");
  oled->sendBuffer();

  Serial.printf("  QR com \"%s\" (%u x %u modulos).\n", kTestPayload, static_cast<unsigned>(qr.size),
                static_cast<unsigned>(qr.size));
  Serial.println("  Teste com 3 celulares: anote modelo, app de leitura e distancia (guia, I06 e pergunta 1).");
}

void testRfid() {
  SPI.begin(PIN_RC522_SCK, PIN_RC522_MISO, PIN_RC522_MOSI, PIN_RC522_SS);
  rfid.PCD_Init();
  const byte version = rfid.PCD_ReadRegister(MFRC522::VersionReg);
  Serial.printf("  VersionReg = 0x%02X", version);
  if (version == 0x00 || version == 0xFF) {
    Serial.println(" (sem resposta: confira SDA 5, SCK 18, MOSI 23, MISO 19, RST 4 e o 3V3)");
    return;
  }
  Serial.println(version == 0x91 || version == 0x92 ? " (RC522 original)"
                                                    : " (clone ou outra versao: se ler a tag, esta ok)");

  Serial.println("  aproxime uma tag (10 s)...");
  const uint32_t start = millis();
  int reads = 0;
  while (millis() - start < 10000) {
    if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
      Serial.print("  UID ");
      for (byte i = 0; i < rfid.uid.size; ++i) Serial.printf("%02X", rfid.uid.uidByte[i]);
      Serial.printf(" (%u bytes, ", static_cast<unsigned>(rfid.uid.size));
      Serial.print(MFRC522::PICC_GetTypeName(MFRC522::PICC_GetType(rfid.uid.sak)));
      Serial.println(")");
      // Halted, a tag left on the reader is not read again until it leaves the field.
      rfid.PICC_HaltA();
      rfid.PCD_StopCrypto1();
      ++reads;
    }
    delay(50);
  }
  if (reads == 0) {
    Serial.println("  nenhuma tag lida. Distancia tipica: 1 a 4 cm; so tags de 13,56 MHz (ISO 14443A)");
  }
}

void testGps() {
  Serial2.setRxBufferSize(1024);  // before begin(); 9600 bps fills the default 256 bytes quickly
  Serial2.begin(GPS_BAUD, SERIAL_8N1, PIN_GPS_RX, PIN_GPS_TX);
  Serial.println("  sentencas do GPS por 15 s:");
  const uint32_t start = millis();
  unsigned long sentences = 0;
  while (millis() - start < 15000) {
    while (Serial2.available() > 0) {
      const int c = Serial2.read();
      if (c == '$') ++sentences;
      Serial.write(static_cast<uint8_t>(c));
    }
    delay(2);
  }
  Serial2.end();
  Serial.printf("\n  %lu sentencas recebidas.\n", sentences);
  if (sentences == 0) {
    Serial.println("  Nada: confira GPS TX no GPIO 16 e a alimentacao (sem resposta no 3V3, teste no +5V).");
  }
  Serial.println("  Sem fix em ambiente fechado e normal (campos vazios); a partida a frio pode levar minutos.");
}

void testServo() {
  servo.setPeriodHertz(50);
  servo.attach(PIN_SERVO, 500, 2400);
  Serial.println("  0 graus (fechada)");
  servo.write(0);
  delay(1000);
  Serial.println("  90 graus (aberta)");
  servo.write(90);
  delay(1500);
  Serial.println("  0 graus (fechada)");
  servo.write(0);
  delay(1000);
  servo.detach();
  Serial.println("  Se a placa reiniciou no meio, o topo mostra \"queda de tensao (brownout)\":");
  Serial.println("  confira o capacitor de 470 uF ou use fonte de 5 V externa com GND comum (guia, pergunta 9).");
}

void testLeds() {
  Serial.println("  verde por 1 s");
  digitalWrite(PIN_LED_GREEN, HIGH);
  delay(1000);
  digitalWrite(PIN_LED_GREEN, LOW);
  Serial.println("  vermelho por 1 s");
  digitalWrite(PIN_LED_RED, HIGH);
  delay(1000);
  digitalWrite(PIN_LED_RED, LOW);
}

void testBuzzer() {
  Serial.println("  1) nivel alto por 300 ms: so o buzzer ATIVO apita (o passivo da no maximo um clique)");
  digitalWrite(PIN_BUZZER, HIGH);
  delay(300);
  digitalWrite(PIN_BUZZER, LOW);
  delay(700);

  Serial.println("  2) tom de 2 kHz por 300 ms: o PASSIVO apita");
  ledcSetup(kBuzzerToneChannel, 2000, 8);
  ledcAttachPin(PIN_BUZZER, kBuzzerToneChannel);
  ledcWriteTone(kBuzzerToneChannel, 2000);
  delay(300);
  ledcWriteTone(kBuzzerToneChannel, 0);
  ledcDetachPin(PIN_BUZZER);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);
  Serial.println("  Anote o tipo na I01 (guia, pergunta 8): o ativo so liga e desliga; o passivo precisa de tom.");
}

}  // namespace

void setup() {
  const uint8_t outputs[] = {PIN_LED_GREEN, PIN_LED_RED, PIN_BUZZER};
  for (uint8_t pin : outputs) {
    pinMode(pin, OUTPUT);
    digitalWrite(pin, LOW);
  }
  Serial.begin(115200);
  Serial.setTimeout(2000);
  delay(300);
  Serial.printf("\nBancada do terminal (I01). Ultimo reinicio: %s\n", resetReasonText(esp_reset_reason()));
  printMenu();
}

void loop() {
  if (Serial.available() == 0) {
    delay(10);
    return;
  }
  const long option = Serial.parseInt();
  while (Serial.available() > 0) Serial.read();  // drop the rest of the line
  Serial.println();

  switch (option) {
    case 0:
      break;  // just Enter: show the menu again
    case 1:
      scanI2c();
      break;
    case 2:
      showOledPattern(oledSsd1306, "SSD1306");
      break;
    case 3:
      showOledPattern(oledSh1106, "SH1106");
      break;
    case 4:
      showTestQr();
      break;
    case 5:
      testRfid();
      break;
    case 6:
      testGps();
      break;
    case 7:
      testServo();
      break;
    case 8:
      testLeds();
      break;
    case 9:
      testBuzzer();
      break;
    default:
      Serial.println("  opcao invalida");
      break;
  }
  printMenu();
}
