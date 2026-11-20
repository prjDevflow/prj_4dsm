#pragma once
#include <stddef.h>
#include <stdint.h>

// RC522 on SPI with the pins of pins.h (guide, I10). Only loop() uses it.

// Leaves the reader ready, with the antenna at full power: on the bench this clone (VersionReg 0x82) read the
// kit card only at the edge with the defaults. False when the chip does not answer (it is logged).
bool nfcBegin();

// Asks the reader for a tag at most every 150 ms (guide: 100 to 200 ms). True when a tag was read, with its
// UID in the contract format in uid (at least kMaxUidTextLength + 1 bytes).
bool nfcPoll(uint32_t nowMs, char* uid, size_t uidSize);
