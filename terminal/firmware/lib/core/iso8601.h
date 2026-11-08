#pragma once
#include <stddef.h>
#include <stdint.h>

// Instant of the contract in ISO 8601 UTC (backend doc 03, section 4.1) as milliseconds since 1970-01-01.
// Accepts "2026-10-20T14:32:07Z" (heartbeat) and a fraction, "2026-10-20T14:32:07.000Z" (QR, commands).
// Returns false for anything else: another offset, no Z, an impossible date. Pure: no libc time functions.
bool parseIsoUtcMs(const char* text, int64_t& epochMs);

// "2026-10-20T14:32:07Z": 20 characters, to the second (milliseconds are dropped, never rounded up).
constexpr size_t kIsoUtcLength = 20;

// Writes the instant in that form and its '\0' (out needs kIsoUtcLength + 1 bytes); false, with out empty,
// when the buffer is small or the year does not fit four digits. Used for lidoEm and ocorridoEm.
bool formatIsoUtc(int64_t epochMs, char* out, size_t outSize);
