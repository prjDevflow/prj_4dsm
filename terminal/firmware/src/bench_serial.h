#pragma once
#include <stdint.h>

// Bench mode (guide, I07): lines typed on the serial monitor (115200 baud, ending with Enter) to try the
// signals and the turnstile without the backend:
//   open [ms]      like an ABRIR (5000 ms when the time is left out)
//   deny <CODE>    like a NEGAR with a code of the contract, e.g. deny DISTANTE_DO_TERMINAL
//   read [UID]     like a tag read; with a UID, the whole flow up to the backend (I11), e.g. read 4E7BBB06
// Left out of a RELEASE_BUILD: in the field only the backend opens the turnstile. Only loop() uses it.
enum class BenchCommandType : uint8_t { Open, Deny, Read };

struct BenchCommand {
  BenchCommandType type;
  uint32_t openMs;  // 0: the default
  char code[32];
};

// Non-blocking: true when a full, valid line arrived.
bool readBenchCommand(BenchCommand& command);
