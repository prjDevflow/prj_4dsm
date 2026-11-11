// Protection against an old or repeated command (guide, I08, and answers 11 and 12).
#include <unity.h>

#include "command_filter.h"

void setUp() {}
void tearDown() {}

// The NVS of the terminal, in memory: counts the saves to check they come before the action.
class FakeStore : public CommandIdStore {
 public:
  bool load(uint32_t& id) override {
    if (!has) return false;
    id = value;
    return true;
  }
  void save(uint32_t id) override {
    has = true;
    value = id;
    ++saves;
  }
  bool has = false;
  uint32_t value = 0;
  int saves = 0;
};

static const int64_t kNow = 1792506727000LL;

static void test_starts_from_zero_with_an_empty_store() {
  FakeStore store;
  CommandFilter filter(store);
  TEST_ASSERT_EQUAL_UINT32(0, filter.after());
}

static void test_a_command_10_seconds_old_runs() {
  FakeStore store;
  CommandFilter filter(store);
  TEST_ASSERT_TRUE(filter.decide(42, true, kNow - 10000, true, kNow) == CommandDecision::Execute);
}

static void test_a_command_10001_ms_old_is_dropped() {
  FakeStore store;
  CommandFilter filter(store);
  TEST_ASSERT_TRUE(filter.decide(42, true, kNow - 10001, true, kNow) == CommandDecision::Expired);
}

static void test_the_same_id_runs_once() {
  FakeStore store;
  CommandFilter filter(store);
  TEST_ASSERT_TRUE(filter.decide(42, true, kNow, true, kNow) == CommandDecision::Execute);
  TEST_ASSERT_TRUE(filter.decide(42, true, kNow, true, kNow) == CommandDecision::Duplicate);
}

// Before the first heartbeat there is no clock: only the id decides (the backend already keeps 10 s).
static void test_without_a_clock_only_new_ids_run() {
  FakeStore store;
  CommandFilter filter(store);
  TEST_ASSERT_TRUE(filter.decide(42, true, kNow - 60000, false, 0) == CommandDecision::Execute);
  TEST_ASSERT_TRUE(filter.decide(42, true, kNow - 60000, false, 0) == CommandDecision::Duplicate);
}

static void test_a_command_without_a_date_runs_when_new() {
  FakeStore store;
  CommandFilter filter(store);
  TEST_ASSERT_TRUE(filter.decide(42, false, 0, true, kNow) == CommandDecision::Execute);
}

static void test_after_only_moves_forward() {
  FakeStore store;
  CommandFilter filter(store);
  filter.decide(47, true, kNow, true, kNow);
  TEST_ASSERT_TRUE(filter.decide(41, true, kNow, true, kNow) == CommandDecision::Duplicate);
  TEST_ASSERT_EQUAL_UINT32(47, filter.after());
}

static void test_ids_compare_as_numbers_and_gaps_are_fine() {
  FakeStore store;
  CommandFilter filter(store);
  TEST_ASSERT_TRUE(filter.decide(9, true, kNow, true, kNow) == CommandDecision::Execute);
  TEST_ASSERT_TRUE(filter.decide(10, true, kNow, true, kNow) == CommandDecision::Execute);
  TEST_ASSERT_TRUE(filter.decide(41, true, kNow, true, kNow) == CommandDecision::Execute);
  TEST_ASSERT_TRUE(filter.decide(47, true, kNow, true, kNow) == CommandDecision::Execute);
}

static void test_the_id_is_saved_before_the_command_runs() {
  FakeStore store;
  CommandFilter filter(store);
  TEST_ASSERT_TRUE(filter.decide(42, true, kNow, true, kNow) == CommandDecision::Execute);
  TEST_ASSERT_EQUAL_UINT32(42, store.value);
  TEST_ASSERT_EQUAL_INT(1, store.saves);
}

// A restart (the brownout of the servo, the EN button) right after an ABRIR must not open again.
static void test_after_a_restart_the_same_command_does_not_run_again() {
  FakeStore store;
  {
    CommandFilter beforeRestart(store);
    beforeRestart.decide(42, true, kNow, true, kNow);
  }
  CommandFilter afterRestart(store);
  TEST_ASSERT_EQUAL_UINT32(42, afterRestart.after());
  TEST_ASSERT_TRUE(afterRestart.decide(42, true, kNow, true, kNow) == CommandDecision::Duplicate);
}

static void test_a_dropped_command_is_never_considered_again() {
  FakeStore store;
  CommandFilter filter(store);
  TEST_ASSERT_TRUE(filter.decide(42, true, kNow - 20000, true, kNow) == CommandDecision::Expired);
  TEST_ASSERT_EQUAL_UINT32(42, filter.after());
  TEST_ASSERT_EQUAL_UINT32(42, store.value);
  TEST_ASSERT_TRUE(filter.decide(42, true, kNow, true, kNow) == CommandDecision::Duplicate);
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_starts_from_zero_with_an_empty_store);
  RUN_TEST(test_a_command_10_seconds_old_runs);
  RUN_TEST(test_a_command_10001_ms_old_is_dropped);
  RUN_TEST(test_the_same_id_runs_once);
  RUN_TEST(test_without_a_clock_only_new_ids_run);
  RUN_TEST(test_a_command_without_a_date_runs_when_new);
  RUN_TEST(test_after_only_moves_forward);
  RUN_TEST(test_ids_compare_as_numbers_and_gaps_are_fine);
  RUN_TEST(test_the_id_is_saved_before_the_command_runs);
  RUN_TEST(test_after_a_restart_the_same_command_does_not_run_again);
  RUN_TEST(test_a_dropped_command_is_never_considered_again);
  return UNITY_END();
}
