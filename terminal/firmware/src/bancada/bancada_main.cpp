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
#include <driver/gpio.h>
#include <qrcode.h>
#include <soc/gpio_periph.h>
#include <soc/io_mux_reg.h>

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
  Serial.println(" 8  Buzzer: ativo ou passivo?");
  Serial.println(" 9  Servo: vai e volta por 30 s (para achar mau contato)");
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

int pollTags(uint32_t durationMs);

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
  // Both antenna drivers (TX1, TX2) must be on, or no tag gets energy from the field.
  const byte txControl = rfid.PCD_ReadRegister(MFRC522::TxControlReg);
  Serial.printf("  antena %s (TxControlReg = 0x%02X)\n", (txControl & 0x03) == 0x03 ? "ligada" : "DESLIGADA",
                txControl);
  rfid.PCD_SetAntennaGain(MFRC522::RxGain_max);  // bench only: the most sensitive receiver

  Serial.println("  aproxime uma tag e deixe parada (duas rodadas de 5 s)");
  Serial.println("  rodada 1, antena com a potencia padrao:");
  int reads = pollTags(5000);
  // Weak clones often read better with the antenna drivers at full conductance (reset values 0x20 and 0x88).
  rfid.PCD_WriteRegister(MFRC522::CWGsPReg, 0x3F);
  rfid.PCD_WriteRegister(MFRC522::GsNReg, 0xF8);
  Serial.println("  rodada 2, antena com a potencia maxima:");
  reads += pollTags(5000);
  rfid.PCD_Init();  // back to the defaults for the next test
  if (reads == 0) {
    Serial.println("  Sem leitura. So tags de 13,56 MHz (ISO 14443A) funcionam; encoste a tag deitada sobre a");
    Serial.println("  espiral da antena e afaste o modulo de metal (as tiras da protoboard desafinam a antena).");
  }
}

// Polls for tags during durationMs, prints each UID read and a summary. Returns how many tags were read.
int pollTags(uint32_t durationMs) {
  const uint32_t start = millis();
  int reads = 0;
  unsigned silent = 0;   // no tag answered the request
  unsigned garbled = 0;  // a tag answered, but the reply or the UID came out broken
  while (millis() - start < durationMs) {
    // The same request as PICC_IsNewCardPresent(), keeping the status to tell the two failures apart.
    byte atqa[2];
    byte atqaSize = sizeof atqa;
    rfid.PCD_WriteRegister(MFRC522::TxModeReg, 0x00);
    rfid.PCD_WriteRegister(MFRC522::RxModeReg, 0x00);
    rfid.PCD_WriteRegister(MFRC522::ModWidthReg, 0x26);
    const MFRC522::StatusCode status = rfid.PICC_RequestA(atqa, &atqaSize);
    if (status == MFRC522::STATUS_TIMEOUT) {
      ++silent;
    } else if (status != MFRC522::STATUS_OK && status != MFRC522::STATUS_COLLISION) {
      ++garbled;
    } else if (rfid.PICC_ReadCardSerial()) {
      Serial.print("  UID ");
      for (byte i = 0; i < rfid.uid.size; ++i) Serial.printf("%02X", rfid.uid.uidByte[i]);
      Serial.printf(" (%u bytes, ", static_cast<unsigned>(rfid.uid.size));
      Serial.print(MFRC522::PICC_GetTypeName(MFRC522::PICC_GetType(rfid.uid.sak)));
      Serial.println(")");
      // Halted, a tag left on the reader is not read again until it leaves the field.
      rfid.PICC_HaltA();
      rfid.PCD_StopCrypto1();
      ++reads;
    } else {
      ++garbled;
    }
    delay(50);
  }
  Serial.printf("    %d tags lidas, %u consultas sem resposta, %u com resposta incompleta\n", reads, silent, garbled);
  return reads;
}

// Level changes on a pin during durationMs. A GPS TX line toggles at every NMEA burst (once a second);
// a loose wire stays still, held low by the pull-down.
unsigned countEdges(uint8_t pin, uint32_t durationMs) {
  pinMode(pin, INPUT_PULLDOWN);
  int last = digitalRead(pin);
  unsigned edges = 0;
  const uint32_t start = millis();
  while (millis() - start < durationMs) {
    const int level = digitalRead(pin);
    if (level != last) {
      ++edges;
      last = level;
    }
  }
  return edges;
}

void testGps() {
  Serial2.setRxBufferSize(1024);  // before begin(); 9600 bps fills the default 256 bytes quickly
  // Receive only: the bench never drives GPIO 17, so swapped wires do not put two transmitters on one line.
  Serial2.begin(GPS_BAUD, SERIAL_8N1, PIN_GPS_RX, -1);
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
    // Which wire carries the GPS TX? Listening to both tells a swap from a module that does not transmit.
    const unsigned edges16 = countEdges(PIN_GPS_RX, 1500);
    const unsigned edges17 = countEdges(PIN_GPS_TX, 1500);
    Serial.printf("  sinal em 1,5 s: GPIO 16 = %u mudancas, GPIO 17 = %u mudancas\n", edges16, edges17);
    if (edges16 > 0) {
      Serial.println("  o TX do GPS chega no GPIO 16, mas nada foi lido: confira a velocidade (9600 bps)");
    } else if (edges17 > 0) {
      Serial.println("  o TX do GPS esta no GPIO 17: TX e RX trocados");
    } else {
      Serial.println("  o GPS nao transmite: sem energia (VCC no +3V3, GND), fio solto ou modulo com defeito");
    }
  }
  Serial.println("  Sem fix em ambiente fechado e normal (campos vazios); a partida a frio pode levar minutos.");
}

// Edges the ESP32 itself puts on the servo pad during durationMs. Reading the pad back (input enabled,
// PWM still routed to it) proves the signal leaves the chip: at 50 Hz, about 100 edges per second.
unsigned countServoEdges(uint32_t durationMs) {
  // What PIN_INPUT_ENABLE() does, without its compile-time assert, which warns inside an unnamed namespace.
  *reinterpret_cast<volatile uint32_t*>(GPIO_PIN_MUX_REG[PIN_SERVO]) |= FUN_IE;
  const gpio_num_t pin = static_cast<gpio_num_t>(PIN_SERVO);
  int last = gpio_get_level(pin);
  unsigned edges = 0;
  const uint32_t start = millis();
  while (millis() - start < durationMs) {
    const int level = gpio_get_level(pin);
    if (level != last) {
      ++edges;
      last = level;
    }
  }
  return edges;
}

void testServo() {
  servo.setPeriodHertz(50);
  servo.attach(PIN_SERVO, 500, 2400);  // returns the PWM channel, and the first one is 0: ask attached()
  if (!servo.attached()) {
    Serial.println("  o servo nao foi ligado ao GPIO 13 (attach falhou)");
    return;
  }
  // Three round trips, slow enough to watch; the first second at 0 degrees also measures the signal.
  unsigned edges = 0;
  for (int trip = 1; trip <= 3; ++trip) {
    Serial.printf("  ida e volta %d: 0 -> 90 -> 0 graus\n", trip);
    servo.write(0);
    if (trip == 1) {
      edges = countServoEdges(1000);
    } else {
      delay(1000);
    }
    servo.write(90);
    delay(1500);
  }
  servo.write(0);
  delay(1000);
  servo.detach();
  Serial.printf("  sinal no GPIO 13: %u bordas em 1 s (o esperado e cerca de 100)\n", edges);
  if (edges < 50) {
    Serial.println("  o ESP32 nao esta gerando o PWM no GPIO 13");
  } else {
    Serial.println("  o ESP32 gera o PWM. Se o servo nao mexeu: fio laranja na fileira do GPIO 13, vermelho no");
    Serial.println("  +5V (o trilho recebe o VIN?), marrom no GND e trilho sem corte no meio da protoboard");
  }
  Serial.println("  Se a placa reiniciou no meio, o topo mostra \"queda de tensao (brownout)\":");
  Serial.println("  confira o capacitor de 470 uF no trilho +5V (faixa no GND); tente outra porta USB ou um power bank.");
}

// Long sweep for hunting a bad contact: it keeps moving while someone presses the jumpers or measures VIN,
// and at each stop a servo with power and signal resists a hand turning its arm.
void sweepServo() {
  servo.setPeriodHertz(50);
  servo.attach(PIN_SERVO, 500, 2400);
  if (!servo.attached()) {
    Serial.println("  o servo nao foi ligado ao GPIO 13 (attach falhou)");
    return;
  }
  Serial.println("  servo indo de 0 a 90 graus e voltando por 30 s (1,5 s em cada ponta)");
  const uint32_t start = millis();
  bool open = false;
  while (millis() - start < 30000) {
    open = !open;
    servo.write(open ? 90 : 0);
    delay(1500);
  }
  servo.write(0);
  delay(1000);
  servo.detach();
  Serial.println("  Mexeu ao apertar um fio: mau contato nele. Nunca mexeu e o braco gira solto: falta o 5 V");
  Serial.println("  no vermelho (VIN), o GND no marrom ou o sinal do GPIO 13 no laranja.");
}

void testBuzzer() {
  // Two different rhythms, so whoever is listening needs no clock: three short beeps can only come from
  // the plain on/off of phase 1, and one long sound from the tone of phase 2.
  Serial.println("  1) tres bipes com nivel alto: so o buzzer ATIVO apita (o passivo da no maximo cliques)");
  for (int beep = 0; beep < 3; ++beep) {
    digitalWrite(PIN_BUZZER, HIGH);
    delay(300);
    digitalWrite(PIN_BUZZER, LOW);
    delay(300);
  }
  delay(1500);

  Serial.println("  2) um tom longo de 2 kHz (1,5 s): o PASSIVO apita (o ativo tambem pode soar, mais aspero)");
  ledcSetup(kBuzzerToneChannel, 2000, 8);
  ledcAttachPin(PIN_BUZZER, kBuzzerToneChannel);
  ledcWriteTone(kBuzzerToneChannel, 2000);
  delay(1500);
  ledcWriteTone(kBuzzerToneChannel, 0);
  ledcDetachPin(PIN_BUZZER);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);
  Serial.println("  Tres bipes: ativo. So o som longo (no maximo cliques antes): passivo (guia, pergunta 8).");
}

}  // namespace

void setup() {
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);
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
      testBuzzer();
      break;
    case 9:
      sweepServo();
      break;
    default:
      Serial.println("  opcao invalida");
      break;
  }
  printMenu();
}
