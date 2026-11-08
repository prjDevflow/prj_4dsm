// UID of an NFC tag in the contract format: uppercase hexadecimal, no separators (guide, I10).
#include <string.h>
#include <unity.h>

#include "uid_format.h"

void setUp() {}
void tearDown() {}

static void test_four_bytes_become_eight_uppercase_characters() {
  const uint8_t uid[] = {0x04, 0xA1, 0xB2, 0xC3};
  char out[kMaxUidTextLength + 1];
  TEST_ASSERT_TRUE(formatUid(uid, sizeof uid, out, sizeof out));
  TEST_ASSERT_EQUAL_STRING("04A1B2C3", out);
}

// The white card of the RC522 kit, read on the bench on 07/11.
static void test_the_card_of_the_kit() {
  const uint8_t uid[] = {0x4E, 0x7B, 0xBB, 0x06};
  char out[kMaxUidTextLength + 1];
  TEST_ASSERT_TRUE(formatUid(uid, sizeof uid, out, sizeof out));
  TEST_ASSERT_EQUAL_STRING("4E7BBB06", out);
}

static void test_seven_and_ten_bytes_give_14_and_20_characters() {
  const uint8_t seven[] = {0x04, 0x1A, 0x2B, 0x3C, 0x4D, 0x5E, 0x6F};
  const uint8_t ten[] = {0x01, 0x23, 0x45, 0x67, 0x89, 0xAB, 0xCD, 0xEF, 0x10, 0x20};
  char out[kMaxUidTextLength + 1];
  TEST_ASSERT_TRUE(formatUid(seven, sizeof seven, out, sizeof out));
  TEST_ASSERT_EQUAL_STRING("041A2B3C4D5E6F", out);
  TEST_ASSERT_TRUE(formatUid(ten, sizeof ten, out, sizeof out));
  TEST_ASSERT_EQUAL_STRING("0123456789ABCDEF1020", out);
}

static void test_leading_zeros_are_kept() {
  const uint8_t uid[] = {0x0A, 0x00, 0x01, 0xFF};
  char out[kMaxUidTextLength + 1];
  TEST_ASSERT_TRUE(formatUid(uid, sizeof uid, out, sizeof out));
  TEST_ASSERT_EQUAL_STRING("0A0001FF", out);
}

static void test_sizes_other_than_4_7_or_10_bytes_are_refused() {
  const uint8_t bytes[11] = {0};
  const size_t sizes[] = {0, 1, 3, 5, 6, 8, 9, 11};
  for (size_t size : sizes) {
    char out[32];
    memset(out, 'x', sizeof out);
    TEST_ASSERT_FALSE(formatUid(bytes, size, out, sizeof out));
    TEST_ASSERT_EQUAL_STRING("", out);
  }
}

static void test_a_small_output_buffer_is_refused() {
  const uint8_t uid[] = {0x04, 0xA1, 0xB2, 0xC3};
  char out[8];
  TEST_ASSERT_FALSE(formatUid(uid, sizeof uid, out, sizeof out));
  TEST_ASSERT_EQUAL_STRING("", out);
}

static void test_missing_bytes_are_refused() {
  char out[kMaxUidTextLength + 1];
  TEST_ASSERT_FALSE(formatUid(nullptr, 4, out, sizeof out));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_four_bytes_become_eight_uppercase_characters);
  RUN_TEST(test_the_card_of_the_kit);
  RUN_TEST(test_seven_and_ten_bytes_give_14_and_20_characters);
  RUN_TEST(test_leading_zeros_are_kept);
  RUN_TEST(test_sizes_other_than_4_7_or_10_bytes_are_refused);
  RUN_TEST(test_a_small_output_buffer_is_refused);
  RUN_TEST(test_missing_bytes_are_refused);
  return UNITY_END();
}
