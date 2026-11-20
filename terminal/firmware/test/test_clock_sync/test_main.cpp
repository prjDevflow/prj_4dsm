// UTC time of the terminal, counted from the serverTime of the last heartbeat (guide, I05).
#include <unity.h>

#include "clock_sync.h"
#include "iso8601.h"

void setUp() {}
void tearDown() {}

static void test_not_synced_before_the_first_heartbeat() {
  ClockSync clock;
  TEST_ASSERT_FALSE(clock.synced());
}

static void test_counts_from_the_server_time() {
  ClockSync clock;
  clock.sync(1792506727000LL, 1000);
  TEST_ASSERT_TRUE(clock.synced());
  TEST_ASSERT_EQUAL_INT64(1792506728500LL, clock.nowEpochMs(2500));
  char text[kIsoUtcLength + 1];
  TEST_ASSERT_TRUE(formatIsoUtc(clock.nowEpochMs(2500), text, sizeof text));
  TEST_ASSERT_EQUAL_STRING("2026-10-20T14:32:08Z", text);  // 1.5 s later, rounded down
}

static void test_survives_the_millis_wrap() {
  ClockSync clock;
  clock.sync(1792506727000LL, 0xFFFFFC18u);  // 1 s before millis() wraps
  TEST_ASSERT_EQUAL_INT64(1792506728500LL, clock.nowEpochMs(500u));
}

static void test_a_new_sync_replaces_the_old_one() {
  ClockSync clock;
  clock.sync(1792506727000LL, 0);
  clock.sync(1792506800000LL, 10000);
  TEST_ASSERT_EQUAL_INT64(1792506800000LL, clock.nowEpochMs(10000));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_not_synced_before_the_first_heartbeat);
  RUN_TEST(test_counts_from_the_server_time);
  RUN_TEST(test_survives_the_millis_wrap);
  RUN_TEST(test_a_new_sync_replaces_the_old_one);
  return UNITY_END();
}
