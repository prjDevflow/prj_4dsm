#include "command_filter.h"

CommandFilter::CommandFilter(CommandIdStore& store, uint32_t maxAgeMs) : store_(store), maxAgeMs_(maxAgeMs) {
  uint32_t saved = 0;
  if (store_.load(saved)) after_ = saved;
}

CommandDecision CommandFilter::decide(uint32_t id, bool hasCreatedAt, int64_t createdAtMs, bool clockSynced,
                                      int64_t nowEpochMs) {
  if (id <= after_) return CommandDecision::Duplicate;
  after_ = id;
  store_.save(id);  // first the id, then the action
  if (hasCreatedAt && clockSynced && nowEpochMs - createdAtMs > static_cast<int64_t>(maxAgeMs_)) {
    return CommandDecision::Expired;
  }
  return CommandDecision::Execute;
}
