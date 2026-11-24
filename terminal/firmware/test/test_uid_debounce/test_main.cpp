// One reading per approach of a tag (guide, I10: 3 s window, NFC_DEBOUNCE_SECONDS of the contract).
#include <unity.h>

#include "uid_debounce.h"

void setUp() {}
void tearDown() {}

static void test_the_first_reading_passes() {
  UidDebounce debounce;
  TEST_ASSERT_TRUE(debounce.accept("04A1B2C3", 0));
}

static void test_the_same_uid_at_2999_ms_is_ignored() {
  UidDebounce debounce;
  debounce.accept("04A1B2C3", 0);
  TEST_ASSERT_FALSE(debounce.accept("04A1B2C3", 2999));
}

static void test_the_same_uid_at_3_s_passes() {
  UidDebounce debounce;
  debounce.accept("04A1B2C3", 0);
  TEST_ASSERT_TRUE(debounce.accept("04A1B2C3", 3000));
}

static void test_a_different_uid_passes_at_once() {
  UidDebounce debounce;
  debounce.accept("04A1B2C3", 0);
  TEST_ASSERT_TRUE(debounce.accept("4E7BBB06", 1));
}

// The bench showed the reader seeing a resting card again and again: every sighting restarts the window,
// so a tag left on the reader for 5 s gives one reading (guide, I10 acceptance).
static void test_a_tag_resting_on_the_reader_gives_one_reading() {
  UidDebounce debounce;
  int readings = 0;
  for (uint32_t now = 0; now <= 5000; now += 500) {
    if (debounce.accept("4E7BBB06", now)) ++readings;
  }
  TEST_ASSERT_EQUAL_INT(1, readings);
}

static void test_the_window_survives_the_millis_wrap() {
  UidDebounce debounce;
  debounce.accept("4E7BBB06", 0xFFFFFF00u);
  TEST_ASSERT_FALSE(debounce.accept("4E7BBB06", 0xFFFFFF00u + 2999u));
  TEST_ASSERT_TRUE(debounce.accept("4E7BBB06", 0xFFFFFF00u + 2999u + 3000u));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_the_first_reading_passes);
  RUN_TEST(test_the_same_uid_at_2999_ms_is_ignored);
  RUN_TEST(test_the_same_uid_at_3_s_passes);
  RUN_TEST(test_a_different_uid_passes_at_once);
  RUN_TEST(test_a_tag_resting_on_the_reader_gives_one_reading);
  RUN_TEST(test_the_window_survives_the_millis_wrap);
  return UNITY_END();
}
