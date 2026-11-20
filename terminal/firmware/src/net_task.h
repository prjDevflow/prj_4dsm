#pragma once
#include <stdint.h>

#include "qr_payload.h"

// Network state the screen shows (guide, sections 6 and 6.1).
enum class NetStatus : uint8_t {
  Starting,    // "Iniciando..."
  NoWifi,      // "Sem Wi-Fi"
  NoServer,    // "Sem servidor"
  InvalidKey,  // "Chave invalida" (401)
  Disabled,    // "Terminal desativado" (403)
  Online,
};

// What the network task publishes, copied as a whole: a reader never sees half an update.
struct NetSnapshot {
  NetStatus status = NetStatus::Starting;
  bool hasQr = false;  // qrPayload may be shown until qrValidUntilMs (millis(), inclusive)
  char qrPayload[kQrPayloadLength + 1] = {};
  uint32_t qrValidUntilMs = 0;
  uint32_t nextQrMs = 0;  // when the next QR is due: the countdown on the screen
};

// Starts the network task on core 0 (guide, section 5.3): Wi-Fi, /health and the QR of the backend (I06).
// Every blocking HTTP call lives there, so loop() keeps the screen, the reader and the buzzer responsive.
void startNetTask();

// Latest snapshot; safe to call from loop(). Before the task publishes, it is a Starting snapshot.
NetSnapshot readNetSnapshot();

// A decision of the backend for the turnstile: ABRIR or NEGAR after a QR (I08), or the answer to a tag (I11).
enum class NetActionType : uint8_t { Open, Deny, Enrolled };

struct NetAction {
  NetActionType type;
  uint32_t openMs;  // aberturaMs of the command or answer, or of the config
  char reason[32];  // code of the contract, for a denial
  bool fromNfc;     // the answer to the tag loop() handed over with submitNfcReading()
};

// Next decision, in the order the backend made them; false when there is none. Safe to call from loop().
bool readNetAction(NetAction& action);

// Hands a tag read by loop() to the network task, which asks the backend (POST /terminal/nfc, I11) and answers
// with a NetAction marked fromNfc. False when the queue is full. Safe to call from loop().
bool submitNfcReading(const char* uid);
