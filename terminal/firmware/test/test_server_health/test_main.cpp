// Three failed heartbeats in a row mean "Sem servidor"; one success brings the terminal back (guide, I05).
#include <unity.h>

#include "server_health.h"

void setUp() {}
void tearDown() {}

static void test_reachable_until_something_fails() {
  ServerHealth health;
  TEST_ASSERT_TRUE(health.reachable());
}

static void test_three_failures_in_a_row_make_it_unreachable() {
  ServerHealth health;
  health.failure();
  health.failure();
  TEST_ASSERT_TRUE(health.reachable());
  health.failure();
  TEST_ASSERT_FALSE(health.reachable());
}

static void test_one_success_makes_it_reachable_again() {
  ServerHealth health;
  for (int i = 0; i < 5; ++i) health.failure();
  health.success();
  TEST_ASSERT_TRUE(health.reachable());
}

static void test_a_success_restarts_the_count() {
  ServerHealth health;
  health.failure();
  health.failure();
  health.success();
  health.failure();
  health.failure();
  TEST_ASSERT_TRUE(health.reachable());
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_reachable_until_something_fails);
  RUN_TEST(test_three_failures_in_a_row_make_it_unreachable);
  RUN_TEST(test_one_success_makes_it_reachable_again);
  RUN_TEST(test_a_success_restarts_the_count);
  return UNITY_END();
}
