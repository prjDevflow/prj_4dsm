#include "nfc_reader.h"

#include <MFRC522.h>
#include <SPI.h>

#include "log.h"
#include "pins.h"
#include "uid_format.h"

namespace {
constexpr uint32_t kPollIntervalMs = 150;

MFRC522 rfid(PIN_RC522_SS, PIN_RC522_RST);
bool ready = false;
uint32_t lastPollMs = 0;
}  // namespace

bool nfcBegin() {
  SPI.begin(PIN_RC522_SCK, PIN_RC522_MISO, PIN_RC522_MOSI, PIN_RC522_SS);
  rfid.PCD_Init();
  const byte version = rfid.PCD_ReadRegister(MFRC522::VersionReg);
  if (version == 0x00 || version == 0xFF) {
    LOGE("nfc", "RC522 sem resposta (VersionReg 0x%02X): confira SS 5, SCK 18, MOSI 23, MISO 19, RST 4 e 3V3",
         version);
    return false;
  }
  // Full receiver gain and antenna drivers at full conductance (reset values 0x20 and 0x88): on the bench,
  // three times as many readings of the kit card as with the defaults.
  rfid.PCD_SetAntennaGain(MFRC522::RxGain_max);
  rfid.PCD_WriteRegister(MFRC522::CWGsPReg, 0x3F);
  rfid.PCD_WriteRegister(MFRC522::GsNReg, 0xF8);
  ready = true;
  LOGI("nfc", "RC522 pronto (VersionReg 0x%02X), antena na potencia maxima", version);
  return true;
}

bool nfcPoll(uint32_t nowMs, char* uid, size_t uidSize) {
  if (!ready || nowMs - lastPollMs < kPollIntervalMs) return false;
  lastPollMs = nowMs;
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return false;
  const bool formatted = formatUid(rfid.uid.uidByte, rfid.uid.size, uid, uidSize);
  rfid.PICC_HaltA();  // a tag left on the reader stays quiet until it leaves the field
  rfid.PCD_StopCrypto1();
  return formatted;
}
