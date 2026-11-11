// Growing wait between retries (guide, I03 test list and section 6).
#include <unity.h>

#include "backoff.h"

void setUp() {}
void tearDown() {}

static void test_starts_at_one_second_and_doubles_on_each_failure() {
  Backoff backoff;
  TEST_ASSERT_EQUAL_UINT32(1000, backoff.nextDelayMs());
  TEST_ASSERT_EQUAL_UINT32(2000, backoff.nextDelayMs());
  TEST_ASSERT_EQUAL_UINT32(4000, backoff.nextDelayMs());
  TEST_ASSERT_EQUAL_UINT32(8000, backoff.nextDelayMs());
  TEST_ASSERT_EQUAL_UINT32(16000, backoff.nextDelayMs());
}

static void test_stops_at_thirty_seconds() {
  Backoff backoff;
  for (int i = 0; i < 5; ++i) backoff.nextDelayMs();
  TEST_ASSERT_EQUAL_UINT32(30000, backoff.nextDelayMs());
  TEST_ASSERT_EQUAL_UINT32(30000, backoff.nextDelayMs());
}

static void test_goes_back_to_one_second_after_a_success() {
  Backoff backoff;
  backoff.nextDelayMs();
  backoff.nextDelayMs();
  backoff.nextDelayMs();
  backoff.reset();
  TEST_ASSERT_EQUAL_UINT32(1000, backoff.nextDelayMs());
}

// The backend accepts 1 QR every 5 s: retrying the QR route must never start below that.
static void test_route_minimum_of_five_seconds() {
  Backoff backoff(5000, 30000);
  TEST_ASSERT_EQUAL_UINT32(5000, backoff.nextDelayMs());
  TEST_ASSERT_EQUAL_UINT32(10000, backoff.nextDelayMs());
  TEST_ASSERT_EQUAL_UINT32(20000, backoff.nextDelayMs());
  TEST_ASSERT_EQUAL_UINT32(30000, backoff.nextDelayMs());
  backoff.reset();
  TEST_ASSERT_EQUAL_UINT32(5000, backoff.nextDelayMs());
}

static void test_peek_does_not_advance() {
  Backoff backoff;
  TEST_ASSERT_EQUAL_UINT32(1000, backoff.peekDelayMs());
  TEST_ASSERT_EQUAL_UINT32(1000, backoff.peekDelayMs());
  TEST_ASSERT_EQUAL_UINT32(1000, backoff.nextDelayMs());
  TEST_ASSERT_EQUAL_UINT32(2000, backoff.peekDelayMs());
}

static void test_maximum_below_minimum_uses_the_minimum() {
  Backoff backoff(5000, 1000);
  TEST_ASSERT_EQUAL_UINT32(5000, backoff.nextDelayMs());
  TEST_ASSERT_EQUAL_UINT32(5000, backoff.nextDelayMs());
}

static void test_zero_minimum_still_grows() {
  Backoff backoff(0, 8);
  TEST_ASSERT_EQUAL_UINT32(1, backoff.nextDelayMs());
  TEST_ASSERT_EQUAL_UINT32(2, backoff.nextDelayMs());
}

static void test_doubling_never_overflows() {
  Backoff backoff(0x80000000u, 0xFFFFFFFFu);
  TEST_ASSERT_EQUAL_UINT32(0x80000000u, backoff.nextDelayMs());
  TEST_ASSERT_EQUAL_UINT32(0xFFFFFFFFu, backoff.nextDelayMs());
  TEST_ASSERT_EQUAL_UINT32(0xFFFFFFFFu, backoff.nextDelayMs());
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_starts_at_one_second_and_doubles_on_each_failure);
  RUN_TEST(test_stops_at_thirty_seconds);
  RUN_TEST(test_goes_back_to_one_second_after_a_success);
  RUN_TEST(test_route_minimum_of_five_seconds);
  RUN_TEST(test_peek_does_not_advance);
  RUN_TEST(test_maximum_below_minimum_uses_the_minimum);
  RUN_TEST(test_zero_minimum_still_grows);
  RUN_TEST(test_doubling_never_overflows);
  return UNITY_END();
}
