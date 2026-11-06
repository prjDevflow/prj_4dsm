// Keys and passwords never appear in the serial log as they are (guide, section 4 and I03).
#include <string.h>
#include <unity.h>

#include "secret_mask.h"

void setUp() {}
void tearDown() {}

static void test_shows_only_the_last_four_characters_of_a_long_key() {
  char out[16];
  maskSecret("terminal-dev-key-1234567890abcdef1234567890", out, sizeof out);
  TEST_ASSERT_EQUAL_STRING("****7890", out);
}

static void test_nine_characters_is_the_shortest_key_that_shows_an_ending() {
  char out[16];
  TEST_ASSERT_EQUAL_STRING("****6789", maskSecret("123456789", out, sizeof out));
}

static void test_short_secret_is_hidden_completely() {
  char out[16];
  TEST_ASSERT_EQUAL_STRING("****", maskSecret("12345678", out, sizeof out));
  TEST_ASSERT_EQUAL_STRING("****", maskSecret("abc", out, sizeof out));
}

static void test_empty_or_missing_secret_says_so() {
  char out[16];
  TEST_ASSERT_EQUAL_STRING("(vazia)", maskSecret("", out, sizeof out));
  TEST_ASSERT_EQUAL_STRING("(vazia)", maskSecret(nullptr, out, sizeof out));
}

static void test_never_writes_past_the_buffer() {
  char buffer[8];
  memset(buffer, 'x', sizeof buffer);
  maskSecret("terminal-dev-key-1234567890abcdef1234567890", buffer, 5);
  TEST_ASSERT_EQUAL_STRING("****", buffer);
  TEST_ASSERT_EQUAL_CHAR('x', buffer[5]);

  memset(buffer, 'x', sizeof buffer);
  maskSecret("terminal-dev-key-1234567890abcdef1234567890", buffer, 3);
  TEST_ASSERT_EQUAL_STRING("**", buffer);
  TEST_ASSERT_EQUAL_CHAR('x', buffer[3]);
}

static void test_zero_sized_buffer_is_left_alone() {
  char buffer[2] = {'x', 'x'};
  maskSecret("segredo-bem-comprido", buffer, 0);
  TEST_ASSERT_EQUAL_CHAR('x', buffer[0]);
}

static void test_returns_the_output_buffer() {
  char out[16];
  TEST_ASSERT_EQUAL_PTR(out, maskSecret("segredo-bem-comprido", out, sizeof out));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_shows_only_the_last_four_characters_of_a_long_key);
  RUN_TEST(test_nine_characters_is_the_shortest_key_that_shows_an_ending);
  RUN_TEST(test_short_secret_is_hidden_completely);
  RUN_TEST(test_empty_or_missing_secret_says_so);
  RUN_TEST(test_never_writes_past_the_buffer);
  RUN_TEST(test_zero_sized_buffer_is_left_alone);
  RUN_TEST(test_returns_the_output_buffer);
  return UNITY_END();
}
