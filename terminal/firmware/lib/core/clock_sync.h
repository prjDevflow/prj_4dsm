#pragma once
#include <stdint.h>

// UTC time of the terminal (guide, I05): the serverTime of the last heartbeat plus the millis() elapsed
// since its answer arrived. Used for the age of the commands (I08), lidoEm (I11) and ocorridoEm (I12).
// The heartbeat syncs again every 10 s, so the 49-day wrap of millis() never stretches a gap.
class ClockSync {
 public:
  void sync(int64_t serverEpochMs, uint32_t millisAtSync) {
    serverEpochMs_ = serverEpochMs;
    millisAtSync_ = millisAtSync;
    synced_ = true;
  }

  bool synced() const { return synced_; }

  // Only meaningful once synced().
  int64_t nowEpochMs(uint32_t nowMillis) const {
    return serverEpochMs_ + static_cast<int64_t>(static_cast<uint32_t>(nowMillis - millisAtSync_));
  }

 private:
  bool synced_ = false;
  int64_t serverEpochMs_ = 0;
  uint32_t millisAtSync_ = 0;
};
