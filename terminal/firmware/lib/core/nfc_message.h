#pragma once
#include <stddef.h>
#include <stdint.h>

// POST /terminal/nfc (guide, I11; backend B17). The answer is always 200 with the decision.
enum class NfcResult : uint8_t { Authorized, Denied, Enrolled };

struct NfcDecision {
  NfcResult result;
  uint32_t openMs;   // only in AUTORIZADO; 0 when absent: the terminal uses config.aberturaMs
  char reason[32];   // only in NEGADO: code of the contract
  bool recognized;   // false for a resultado the terminal does not know: it is handled as denied
};

// Writes the body, only uid and, when the clock is synced, lidoEm to the second. lidoEm is optional for the
// backend, which decides by its own clock. Returns the length, or 0 (out empty) when the buffer is small.
size_t buildNfcJson(const char* uid, bool hasReadAt, int64_t readAtEpochMs, char* out, size_t outSize);

// Reads a 200 answer. False when it is not an object with a text resultado; an unknown resultado gives
// Denied with recognized = false, so it never opens the turnstile.
bool parseNfcResponse(const char* json, size_t length, NfcDecision& decision);
