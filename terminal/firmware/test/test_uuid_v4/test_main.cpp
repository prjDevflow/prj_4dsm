// Idempotency-Key of each NFC reading: a version 4 UUID from 16 random bytes (guide, I11).
#include <string.h>
#include <unity.h>

#include "uuid_v4.h"

void setUp() {}
void tearDown() {}

static void test_sets_the_version_and_the_variant() {
  uint8_t bytes[16];
  for (int i = 0; i < 16; ++i) bytes[i] = static_cast<uint8_t>(i);
  char key[kUuidLength + 1];
  TEST_ASSERT_TRUE(formatUuidV4(bytes, key, sizeof key));
  TEST_ASSERT_EQUAL_STRING("00010203-0405-4607-8809-0a0b0c0d0e0f", key);
}

static void test_all_ones_keep_only_the_fixed_bits() {
  uint8_t bytes[16];
  memset(bytes, 0xFF, sizeof bytes);
  char key[kUuidLength + 1];
  TEST_ASSERT_TRUE(formatUuidV4(bytes, key, sizeof key));
  TEST_ASSERT_EQUAL_STRING("ffffffff-ffff-4fff-bfff-ffffffffffff", key);
}

// xxxxxxxx-xxxx-4xxx-[89ab]xxx-xxxxxxxxxxxx, lowercase: how the backend keeps the key.
static void test_the_shape_is_the_one_the_backend_expects() {
  const uint8_t bytes[16] = {0xA7, 0x3C, 0x91, 0x5E, 0x08, 0xD2, 0x6F, 0x14,
                             0x2B, 0xC0, 0x77, 0xE9, 0x45, 0x1A, 0xF3, 0x88};
  char key[kUuidLength + 1];
  TEST_ASSERT_TRUE(formatUuidV4(bytes, key, sizeof key));
  TEST_ASSERT_EQUAL_UINT32(kUuidLength, strlen(key));
  for (size_t i = 0; i < kUuidLength; ++i) {
    if (i == 8 || i == 13 || i == 18 || i == 23) {
      TEST_ASSERT_EQUAL_CHAR('-', key[i]);
    } else {
      TEST_ASSERT_NOT_NULL(strchr("0123456789abcdef", key[i]));
    }
  }
  TEST_ASSERT_EQUAL_CHAR('4', key[14]);
  TEST_ASSERT_NOT_NULL(strchr("89ab", key[19]));
}

static void test_different_bytes_give_different_keys() {
  uint8_t first[16] = {0};
  uint8_t second[16] = {0};
  second[15] = 1;
  char a[kUuidLength + 1];
  char b[kUuidLength + 1];
  formatUuidV4(first, a, sizeof a);
  formatUuidV4(second, b, sizeof b);
  TEST_ASSERT_TRUE(strcmp(a, b) != 0);
}

static void test_a_small_buffer_is_refused() {
  const uint8_t bytes[16] = {0};
  char key[kUuidLength];
  TEST_ASSERT_FALSE(formatUuidV4(bytes, key, sizeof key));
  TEST_ASSERT_EQUAL_STRING("", key);
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_sets_the_version_and_the_variant);
  RUN_TEST(test_all_ones_keep_only_the_fixed_bits);
  RUN_TEST(test_the_shape_is_the_one_the_backend_expects);
  RUN_TEST(test_different_bytes_give_different_keys);
  RUN_TEST(test_a_small_buffer_is_refused);
  return UNITY_END();
}
