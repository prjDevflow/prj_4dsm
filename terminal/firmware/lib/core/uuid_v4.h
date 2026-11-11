#pragma once
#include <stddef.h>
#include <stdint.h>

// Version 4 UUID (RFC 4122) from 16 random bytes: the Idempotency-Key of each NFC reading (guide, I11). The
// caller brings the bytes (esp_random() on the ESP32, fixed ones in the tests). Lowercase, with dashes.
constexpr size_t kUuidLength = 36;

// Writes the UUID and its '\0' (out needs kUuidLength + 1 bytes); false, with out empty, when it is smaller.
bool formatUuidV4(const uint8_t random[16], char* out, size_t outSize);
