// HTTP status of a terminal route as the result the firmware acts on (guide, I04 and section 6).
#include <unity.h>

#include "http_result.h"

void setUp() {}
void tearDown() {}

static void test_success_statuses_are_ok() {
  TEST_ASSERT_TRUE(classifyHttpStatus(200) == HttpResult::Ok);
  TEST_ASSERT_TRUE(classifyHttpStatus(204) == HttpResult::Ok);
}

static void test_each_error_status_of_the_contract_has_its_result() {
  TEST_ASSERT_TRUE(classifyHttpStatus(401) == HttpResult::Unauthorized);
  TEST_ASSERT_TRUE(classifyHttpStatus(403) == HttpResult::Forbidden);
  TEST_ASSERT_TRUE(classifyHttpStatus(422) == HttpResult::Unprocessable);
  TEST_ASSERT_TRUE(classifyHttpStatus(429) == HttpResult::RateLimited);
  TEST_ASSERT_TRUE(classifyHttpStatus(500) == HttpResult::ServerError);
  TEST_ASSERT_TRUE(classifyHttpStatus(503) == HttpResult::ServerError);
}

static void test_other_client_errors_are_grouped() {
  TEST_ASSERT_TRUE(classifyHttpStatus(404) == HttpResult::ClientError);
  TEST_ASSERT_TRUE(classifyHttpStatus(409) == HttpResult::ClientError);
}

// A redirect or an informational answer is nothing the terminal can use: it counts as a broken server.
static void test_unusable_statuses_count_as_server_error() {
  TEST_ASSERT_TRUE(classifyHttpStatus(301) == HttpResult::ServerError);
  TEST_ASSERT_TRUE(classifyHttpStatus(100) == HttpResult::ServerError);
  TEST_ASSERT_TRUE(classifyHttpStatus(0) == HttpResult::ServerError);
}

static void test_retry_after_in_seconds_becomes_milliseconds() {
  TEST_ASSERT_EQUAL_UINT32(5000, parseRetryAfterMs("5"));
  TEST_ASSERT_EQUAL_UINT32(0, parseRetryAfterMs("0"));
  TEST_ASSERT_EQUAL_UINT32(120000, parseRetryAfterMs("120"));
}

// Without a usable header the caller falls back to its growing delay.
static void test_missing_or_odd_retry_after_gives_zero() {
  TEST_ASSERT_EQUAL_UINT32(0, parseRetryAfterMs(nullptr));
  TEST_ASSERT_EQUAL_UINT32(0, parseRetryAfterMs(""));
  TEST_ASSERT_EQUAL_UINT32(0, parseRetryAfterMs("abc"));
  TEST_ASSERT_EQUAL_UINT32(0, parseRetryAfterMs("5s"));
  TEST_ASSERT_EQUAL_UINT32(0, parseRetryAfterMs("-5"));
  TEST_ASSERT_EQUAL_UINT32(0, parseRetryAfterMs("Wed, 21 Oct 2026 07:28:00 GMT"));
}

static void test_retry_after_is_capped_at_one_hour() {
  TEST_ASSERT_EQUAL_UINT32(3600000, parseRetryAfterMs("3601"));
  TEST_ASSERT_EQUAL_UINT32(3600000, parseRetryAfterMs("99999999999999999999"));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_success_statuses_are_ok);
  RUN_TEST(test_each_error_status_of_the_contract_has_its_result);
  RUN_TEST(test_other_client_errors_are_grouped);
  RUN_TEST(test_unusable_statuses_count_as_server_error);
  RUN_TEST(test_retry_after_in_seconds_becomes_milliseconds);
  RUN_TEST(test_missing_or_odd_retry_after_gives_zero);
  RUN_TEST(test_retry_after_is_capped_at_one_hour);
  return UNITY_END();
}
