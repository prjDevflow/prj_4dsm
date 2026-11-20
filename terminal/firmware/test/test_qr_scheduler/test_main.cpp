// When to ask for a QR and until when it may stay on the screen (guide, I06 and section 5.4).
#include <unity.h>

#include "qr_scheduler.h"

void setUp() {}
void tearDown() {}

static void test_the_first_request_goes_out_at_once() {
  QrScheduler scheduler;
  TEST_ASSERT_TRUE(scheduler.due(0));
  TEST_ASSERT_TRUE(scheduler.due(123456));
}

static void test_the_next_request_goes_out_after_renovarEmMs() {
  QrScheduler scheduler;
  scheduler.requestStarted(1000);
  scheduler.succeeded(15000, 10000);
  TEST_ASSERT_FALSE(scheduler.due(10999));
  TEST_ASSERT_TRUE(scheduler.due(11000));
  TEST_ASSERT_EQUAL_UINT32(11000, scheduler.nextRequestMs());
}

// The backend accepts one QR every 5 s per terminal (429 otherwise).
static void test_a_refresh_below_five_seconds_waits_the_minimum() {
  QrScheduler scheduler;
  scheduler.requestStarted(1000);
  scheduler.succeeded(15000, 2000);
  TEST_ASSERT_FALSE(scheduler.due(5999));
  TEST_ASSERT_TRUE(scheduler.due(6000));
}

static void test_failures_wait_5_10_20_then_30_seconds() {
  QrScheduler scheduler;
  const uint32_t waits[] = {5000, 10000, 20000, 30000, 30000};
  uint32_t now = 0;
  for (uint32_t wait : waits) {
    scheduler.requestStarted(now);
    scheduler.failed(now, 0);
    TEST_ASSERT_FALSE(scheduler.due(now + wait - 1));
    TEST_ASSERT_TRUE(scheduler.due(now + wait));
    now += wait;
  }
}

static void test_a_success_restarts_the_growing_wait() {
  QrScheduler scheduler;
  scheduler.requestStarted(0);
  scheduler.failed(0, 0);  // 5 s
  scheduler.requestStarted(5000);
  scheduler.failed(5000, 0);  // 10 s
  scheduler.requestStarted(15000);
  scheduler.succeeded(15000, 10000);
  scheduler.requestStarted(25000);
  scheduler.failed(25000, 0);
  TEST_ASSERT_FALSE(scheduler.due(29999));
  TEST_ASSERT_TRUE(scheduler.due(30000));
}

static void test_retry_after_is_used_but_never_below_the_minimum() {
  QrScheduler longWait;
  longWait.requestStarted(0);
  longWait.failed(100, 7000);
  TEST_ASSERT_FALSE(longWait.due(7099));
  TEST_ASSERT_TRUE(longWait.due(7100));

  QrScheduler shortWait;
  shortWait.requestStarted(0);
  shortWait.failed(100, 1000);
  TEST_ASSERT_FALSE(shortWait.due(4999));
  TEST_ASSERT_TRUE(shortWait.due(5000));
}

// 401 and 403 do not get better by insisting: try again once a minute (guide, section 6).
static void test_a_rejected_terminal_waits_a_minute() {
  QrScheduler scheduler;
  scheduler.requestStarted(0);
  scheduler.rejected(200);
  TEST_ASSERT_FALSE(scheduler.due(60199));
  TEST_ASSERT_TRUE(scheduler.due(60200));
}

static void test_no_qr_is_valid_before_the_first_success() {
  QrScheduler scheduler;
  TEST_ASSERT_FALSE(scheduler.qrValid(0));
  scheduler.requestStarted(0);
  scheduler.failed(10, 0);
  TEST_ASSERT_FALSE(scheduler.qrValid(20));
}

// The deadline counts from when the request left: the QR was issued later, so the screen drops it no
// later than the backend's expiraEm. Exactly at the deadline it is still valid.
static void test_a_qr_is_valid_up_to_its_deadline() {
  QrScheduler scheduler;
  scheduler.requestStarted(1000);
  scheduler.succeeded(15000, 10000);
  TEST_ASSERT_TRUE(scheduler.qrValid(1000));
  TEST_ASSERT_TRUE(scheduler.qrValid(16000));
  TEST_ASSERT_FALSE(scheduler.qrValid(16001));
  TEST_ASSERT_EQUAL_UINT32(16000, scheduler.qrValidUntilMs());
}

static void test_a_failed_refresh_keeps_the_current_qr_until_its_deadline() {
  QrScheduler scheduler;
  scheduler.requestStarted(0);
  scheduler.succeeded(15000, 10000);
  scheduler.requestStarted(10000);
  scheduler.failed(10100, 0);
  TEST_ASSERT_TRUE(scheduler.qrValid(15000));
  TEST_ASSERT_FALSE(scheduler.qrValid(15001));
}

// Never an old QR again: not even when millis() wraps around, 49 days later.
static void test_an_expired_qr_stays_expired_after_the_clock_wraps() {
  QrScheduler scheduler;
  scheduler.requestStarted(1000);
  scheduler.succeeded(15000, 10000);
  TEST_ASSERT_FALSE(scheduler.qrValid(16001));
  TEST_ASSERT_FALSE(scheduler.qrValid(16001u + 0x80000000u));
  TEST_ASSERT_FALSE(scheduler.qrValid(1000u + 0xFFFFFFFFu));
}

static void test_countdown_to_the_next_request() {
  QrScheduler scheduler;
  TEST_ASSERT_EQUAL_UINT32(0, scheduler.secondsToNextRequest(0));
  scheduler.requestStarted(1000);
  scheduler.succeeded(15000, 10000);
  TEST_ASSERT_EQUAL_UINT32(10, scheduler.secondsToNextRequest(1000));
  TEST_ASSERT_EQUAL_UINT32(7, scheduler.secondsToNextRequest(4500));
  TEST_ASSERT_EQUAL_UINT32(1, scheduler.secondsToNextRequest(10999));
  TEST_ASSERT_EQUAL_UINT32(0, scheduler.secondsToNextRequest(11000));
  TEST_ASSERT_EQUAL_UINT32(0, scheduler.secondsToNextRequest(20000));
}

static void test_the_schedule_survives_the_millis_wrap() {
  const uint32_t start = 0xFFFFF000u;
  QrScheduler scheduler;
  scheduler.requestStarted(start);
  scheduler.succeeded(15000, 10000);
  TEST_ASSERT_FALSE(scheduler.due(start + 9999u));
  TEST_ASSERT_TRUE(scheduler.due(start + 10000u));
  TEST_ASSERT_TRUE(scheduler.qrValid(start + 15000u));
  TEST_ASSERT_FALSE(scheduler.qrValid(start + 15001u));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_the_first_request_goes_out_at_once);
  RUN_TEST(test_the_next_request_goes_out_after_renovarEmMs);
  RUN_TEST(test_a_refresh_below_five_seconds_waits_the_minimum);
  RUN_TEST(test_failures_wait_5_10_20_then_30_seconds);
  RUN_TEST(test_a_success_restarts_the_growing_wait);
  RUN_TEST(test_retry_after_is_used_but_never_below_the_minimum);
  RUN_TEST(test_a_rejected_terminal_waits_a_minute);
  RUN_TEST(test_no_qr_is_valid_before_the_first_success);
  RUN_TEST(test_a_qr_is_valid_up_to_its_deadline);
  RUN_TEST(test_a_failed_refresh_keeps_the_current_qr_until_its_deadline);
  RUN_TEST(test_an_expired_qr_stays_expired_after_the_clock_wraps);
  RUN_TEST(test_countdown_to_the_next_request);
  RUN_TEST(test_the_schedule_survives_the_millis_wrap);
  return UNITY_END();
}
