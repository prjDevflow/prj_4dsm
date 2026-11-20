#pragma once
#include <stddef.h>
#include <stdint.h>

// UID of an NFC tag in the contract format (backend doc 03, section 4.5): uppercase hexadecimal without
// separators. ISO 14443A UIDs have 4, 7 or 10 bytes: 8, 14 or 20 characters.
constexpr size_t kMaxUidTextLength = 20;

// Writes the text and its '\0' into out (at least size * 2 + 1 bytes). On any other size, missing bytes or
// a small buffer it returns false and leaves out empty.
bool formatUid(const uint8_t* bytes, size_t size, char* out, size_t outSize);
