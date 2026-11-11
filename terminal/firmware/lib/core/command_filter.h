#pragma once
#include <stdint.h>

// Where the highest command id ever decided survives a restart (the NVS on the ESP32, a fake in the tests).
class CommandIdStore {
 public:
  virtual ~CommandIdStore() = default;
  virtual bool load(uint32_t& id) = 0;  // false when nothing was saved yet
  virtual void save(uint32_t id) = 0;
};

enum class CommandDecision : uint8_t { Execute, Duplicate, Expired };

// Protection against an old or repeated command (guide, I08; answers 11 and 12).
//
// - after() is the highest id ever decided; it goes in GET /terminal/commands?after= and only moves
//   forward. Ids are compared as numbers; gaps are normal (the sequence is shared by all terminals).
// - A command at or below after() is a duplicate: the ack does not take it out of the list, so it comes back
//   while it is younger than 10 s.
// - A new id is saved before the decision is returned, so a restart in the middle of an ABRIR (the brownout
//   of the servo, the EN button) never opens the turnstile twice. after() starts from the saved id.
// - With the clock synced, a command more than maxAgeMs old is dropped; without a clock, or without a date,
//   only the id decides (the backend already delivers commands for 10 s only).
class CommandFilter {
 public:
  explicit CommandFilter(CommandIdStore& store, uint32_t maxAgeMs = 10000);

  uint32_t after() const { return after_; }

  // Decide the commands of one poll in increasing id order.
  CommandDecision decide(uint32_t id, bool hasCreatedAt, int64_t createdAtMs, bool clockSynced,
                         int64_t nowEpochMs);

 private:
  CommandIdStore& store_;
  uint32_t maxAgeMs_;
  uint32_t after_ = 0;
};
