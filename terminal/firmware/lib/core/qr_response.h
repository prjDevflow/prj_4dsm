#pragma once
#include <stddef.h>
#include <stdint.h>

#include "qr_payload.h"

// Answer of POST /terminal/qr (backend doc 03, section 4.5), reduced to what the terminal needs.
struct QrResponse {
  char payload[kQrPayloadLength + 1];
  uint32_t validityMs;  // expiraEm - emitidoEm: how long the QR lasts after it was issued (15 s)
  uint32_t refreshMs;   // renovarEmMs: when to ask for the next one
};

// renovarEmMs when the answer brings none, or an odd one (guide, section 5.4).
constexpr uint32_t kDefaultQrRefreshMs = 10000;

// Reads the JSON of a 200 answer. False when the payload breaks the contract or the dates are missing,
// malformed, out of order or more than five minutes apart: out is then left as it was, and nothing new
// is drawn.
bool parseQrResponse(const char* json, size_t length, QrResponse& out);
