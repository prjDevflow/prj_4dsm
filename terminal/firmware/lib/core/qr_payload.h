#pragma once
#include <stddef.h>

// QR payload of the contract (backend doc 03, section 4.3): "ACS1:" and a 22-character base64url token
// (A-Z, a-z, 0-9, '-' and '_'), 27 characters in all. The backend generates it; the terminal only draws
// what passes this check.
constexpr size_t kQrPayloadLength = 27;

bool isValidQrPayload(const char* payload);
