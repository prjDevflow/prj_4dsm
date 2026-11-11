// Instants of the contract in ISO 8601 UTC (backend doc 03, section 4.1). The heartbeat sends them to the
// second ("...07Z") and the QR with milliseconds ("...07.000Z"): both must work.
#include <unity.h>

#include "iso8601.h"

void setUp() {}
void tearDown() {}

static int64_t parsed(const char* text) {
  int64_t epochMs = -1;
  TEST_ASSERT_TRUE_MESSAGE(parseIsoUtcMs(text, epochMs), text);
  return epochMs;
}

static void test_reads_an_instant_to_the_second() {
  TEST_ASSERT_EQUAL_INT64(1792506727000LL, parsed("2026-10-20T14:32:07Z"));
}

static void test_reads_milliseconds() {
  TEST_ASSERT_EQUAL_INT64(1792506727000LL, parsed("2026-10-20T14:32:07.000Z"));
  TEST_ASSERT_EQUAL_INT64(1792506727123LL, parsed("2026-10-20T14:32:07.123Z"));
  TEST_ASSERT_EQUAL_INT64(1792506727500LL, parsed("2026-10-20T14:32:07.5Z"));
  TEST_ASSERT_EQUAL_INT64(1792506727123LL, parsed("2026-10-20T14:32:07.123456Z"));
}

static void test_qr_of_the_contract_lasts_15_seconds() {
  TEST_ASSERT_EQUAL_INT64(15000LL, parsed("2026-10-20T14:32:22.000Z") - parsed("2026-10-20T14:32:07.000Z"));
}

static void test_epoch_start_and_a_leap_day() {
  TEST_ASSERT_EQUAL_INT64(0LL, parsed("1970-01-01T00:00:00Z"));
  TEST_ASSERT_EQUAL_INT64(1709164800000LL, parsed("2024-02-29T00:00:00Z"));
}

static void test_impossible_dates_and_times_are_refused() {
  const char* const invalid[] = {
      "2026-02-29T00:00:00Z", "2026-13-01T00:00:00Z", "2026-00-10T00:00:00Z", "2026-10-32T00:00:00Z",
      "2026-10-00T00:00:00Z", "2026-10-20T24:00:00Z", "2026-10-20T14:60:00Z", "2026-10-20T14:32:60Z",
  };
  for (const char* text : invalid) {
    int64_t epochMs = 0;
    TEST_ASSERT_FALSE_MESSAGE(parseIsoUtcMs(text, epochMs), text);
  }
}

static void test_other_formats_are_refused() {
  const char* const invalid[] = {
      "2026-10-20T14:32:07",        // no zone
      "2026-10-20T14:32:07+00:00",  // offset instead of Z
      "2026-10-20 14:32:07Z",       // space instead of T
      "2026-10-20T14:32:07.Z",      // dot without digits
      "2026-10-20T14:32:07Zx",      // trailing text
      "26-10-20T14:32:07Z",         // two-digit year
      "",
  };
  for (const char* text : invalid) {
    int64_t epochMs = 0;
    TEST_ASSERT_FALSE_MESSAGE(parseIsoUtcMs(text, epochMs), text);
  }
  int64_t epochMs = 0;
  TEST_ASSERT_FALSE(parseIsoUtcMs(nullptr, epochMs));
}

// lidoEm (NFC) and ocorridoEm (offline events) go to the backend to the second, like the heartbeat.
static void test_formats_an_instant_to_the_second() {
  char text[kIsoUtcLength + 1];
  TEST_ASSERT_TRUE(formatIsoUtc(1792506727000LL, text, sizeof text));
  TEST_ASSERT_EQUAL_STRING("2026-10-20T14:32:07Z", text);
  TEST_ASSERT_TRUE(formatIsoUtc(1792506727999LL, text, sizeof text));
  TEST_ASSERT_EQUAL_STRING("2026-10-20T14:32:07Z", text);
}

static void test_formatting_and_parsing_agree() {
  char text[kIsoUtcLength + 1];
  TEST_ASSERT_TRUE(formatIsoUtc(0, text, sizeof text));
  TEST_ASSERT_EQUAL_STRING("1970-01-01T00:00:00Z", text);
  TEST_ASSERT_TRUE(formatIsoUtc(parsed("2024-02-29T23:59:59Z"), text, sizeof text));
  TEST_ASSERT_EQUAL_STRING("2024-02-29T23:59:59Z", text);
  TEST_ASSERT_TRUE(formatIsoUtc(parsed("2026-12-31T23:59:59Z"), text, sizeof text));
  TEST_ASSERT_EQUAL_STRING("2026-12-31T23:59:59Z", text);
}

static void test_formatting_into_a_small_buffer_is_refused() {
  char text[kIsoUtcLength];
  TEST_ASSERT_FALSE(formatIsoUtc(1792506727000LL, text, sizeof text));
  TEST_ASSERT_EQUAL_STRING("", text);
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_formats_an_instant_to_the_second);
  RUN_TEST(test_formatting_and_parsing_agree);
  RUN_TEST(test_formatting_into_a_small_buffer_is_refused);
  RUN_TEST(test_reads_an_instant_to_the_second);
  RUN_TEST(test_reads_milliseconds);
  RUN_TEST(test_qr_of_the_contract_lasts_15_seconds);
  RUN_TEST(test_epoch_start_and_a_leap_day);
  RUN_TEST(test_impossible_dates_and_times_are_refused);
  RUN_TEST(test_other_formats_are_refused);
  return UNITY_END();
}
