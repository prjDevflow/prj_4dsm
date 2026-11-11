// What the buzzer and the turnstile do after each event (guide, I07 "Padroes de sinal", without the LEDs).
#include <unity.h>

#include "signal_plan.h"

void setUp() {}
void tearDown() {}

static bool buzzerAt(SignalPlan& plan, uint32_t nowMs) { return plan.update(nowMs).buzzerOn; }
static bool openAt(SignalPlan& plan, uint32_t nowMs) { return plan.update(nowMs).turnstileOpen; }

static void test_starts_closed_and_silent() {
  SignalPlan plan;
  const SignalOutputs outputs = plan.update(0);
  TEST_ASSERT_FALSE(outputs.buzzerOn);
  TEST_ASSERT_FALSE(outputs.turnstileOpen);
}

static void test_granted_beeps_once_for_300_ms() {
  SignalPlan plan;
  plan.start(SignalEvent::Granted, 1000, 5000);
  TEST_ASSERT_TRUE(buzzerAt(plan, 1000));
  TEST_ASSERT_TRUE(buzzerAt(plan, 1299));
  TEST_ASSERT_FALSE(buzzerAt(plan, 1300));
  TEST_ASSERT_FALSE(buzzerAt(plan, 2000));
}

static void test_granted_opens_for_openMs_and_closes_on_time() {
  SignalPlan plan;
  plan.start(SignalEvent::Granted, 1000, 5000);
  TEST_ASSERT_TRUE(openAt(plan, 1000));
  TEST_ASSERT_TRUE(openAt(plan, 5999));
  TEST_ASSERT_FALSE(openAt(plan, 6000));
}

static void test_denied_beeps_three_times_150_ms_apart() {
  SignalPlan plan;
  plan.start(SignalEvent::Denied, 0);
  const uint32_t times[] = {0, 149, 150, 299, 300, 449, 450, 599, 600, 749, 750, 1000};
  const bool expected[] = {true, true, false, false, true, true, false, false, true, true, false, false};
  for (size_t i = 0; i < sizeof times / sizeof times[0]; ++i) {
    TEST_ASSERT_EQUAL_MESSAGE(expected[i], buzzerAt(plan, times[i]), "bipe fora do padrao");
  }
}

static void test_denied_keeps_the_turnstile_closed() {
  SignalPlan plan;
  plan.start(SignalEvent::Denied, 0);
  TEST_ASSERT_FALSE(openAt(plan, 0));
  TEST_ASSERT_FALSE(openAt(plan, 500));
}

static void test_tag_read_beeps_for_80_ms() {
  SignalPlan plan;
  plan.start(SignalEvent::TagRead, 0);
  TEST_ASSERT_TRUE(buzzerAt(plan, 79));
  TEST_ASSERT_FALSE(buzzerAt(plan, 80));
  TEST_ASSERT_FALSE(openAt(plan, 81));
}

// Enrollment mode of the admin (B16, I11): "Tag cadastrada" with a confirmation, and nobody goes through.
static void test_enrolled_beeps_twice_without_opening() {
  SignalPlan plan;
  plan.start(SignalEvent::Enrolled, 0);
  const uint32_t times[] = {0, 99, 100, 199, 200, 299, 300};
  const bool expected[] = {true, true, false, false, true, true, false};
  for (size_t i = 0; i < sizeof times / sizeof times[0]; ++i) {
    TEST_ASSERT_EQUAL_MESSAGE(expected[i], buzzerAt(plan, times[i]), "bipe fora do padrao");
  }
  TEST_ASSERT_FALSE(openAt(plan, 301));
}

// A second ABRIR while open extends the opening from the second command; it never stacks.
static void test_a_second_granted_extends_from_the_second_command() {
  SignalPlan plan;
  plan.start(SignalEvent::Granted, 0, 5000);
  plan.start(SignalEvent::Granted, 3000, 5000);
  TEST_ASSERT_TRUE(openAt(plan, 7999));
  TEST_ASSERT_FALSE(openAt(plan, 8000));
}

static void test_a_shorter_second_granted_never_cuts_the_opening() {
  SignalPlan plan;
  plan.start(SignalEvent::Granted, 0, 5000);
  plan.start(SignalEvent::Granted, 1000, 1000);
  TEST_ASSERT_TRUE(openAt(plan, 4999));
  TEST_ASSERT_FALSE(openAt(plan, 5000));
}

// Two readings of the same QR give an ABRIR and a NEGAR (B15): the person was already let in by the first.
static void test_denied_during_an_opening_does_not_close_it() {
  SignalPlan plan;
  plan.start(SignalEvent::Granted, 0, 5000);
  plan.start(SignalEvent::Denied, 1000);
  TEST_ASSERT_TRUE(buzzerAt(plan, 1000));
  TEST_ASSERT_TRUE(openAt(plan, 4999));
  TEST_ASSERT_FALSE(openAt(plan, 5000));
}

static void test_finished_signals_stay_off_after_the_clock_wraps() {
  SignalPlan plan;
  plan.start(SignalEvent::Granted, 0, 5000);
  plan.update(6000);
  const SignalOutputs wrapped = plan.update(0x80000000u + 100u);
  TEST_ASSERT_FALSE(wrapped.buzzerOn);
  TEST_ASSERT_FALSE(wrapped.turnstileOpen);
  const SignalOutputs again = plan.update(0xFFFFFFFFu);
  TEST_ASSERT_FALSE(again.buzzerOn);
  TEST_ASSERT_FALSE(again.turnstileOpen);
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_starts_closed_and_silent);
  RUN_TEST(test_granted_beeps_once_for_300_ms);
  RUN_TEST(test_granted_opens_for_openMs_and_closes_on_time);
  RUN_TEST(test_denied_beeps_three_times_150_ms_apart);
  RUN_TEST(test_denied_keeps_the_turnstile_closed);
  RUN_TEST(test_tag_read_beeps_for_80_ms);
  RUN_TEST(test_enrolled_beeps_twice_without_opening);
  RUN_TEST(test_a_second_granted_extends_from_the_second_command);
  RUN_TEST(test_a_shorter_second_granted_never_cuts_the_opening);
  RUN_TEST(test_denied_during_an_opening_does_not_close_it);
  RUN_TEST(test_finished_signals_stay_off_after_the_clock_wraps);
  return UNITY_END();
}
