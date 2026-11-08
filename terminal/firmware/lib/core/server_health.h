#pragma once
#include <stdint.h>

// Whether the backend answers the heartbeat (guide, I05): three failures in a row mean "Sem servidor", and
// a single success brings the terminal back.
class ServerHealth {
 public:
  void success() { failures_ = 0; }
  void failure() {
    if (failures_ < kUnreachableAfter) ++failures_;
  }
  bool reachable() const { return failures_ < kUnreachableAfter; }

 private:
  static constexpr uint8_t kUnreachableAfter = 3;
  uint8_t failures_ = 0;
};
