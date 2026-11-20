// The terminal only draws a payload in the contract format (guide, I06; backend doc 03, section 4.3).
#include <unity.h>

#include "qr_payload.h"

void setUp() {}
void tearDown() {}

static void test_accepts_the_contract_example() {
  TEST_ASSERT_TRUE(isValidQrPayload("ACS1:q3F8k2Zr1pLw9XbTn0YhVA"));
}

static void test_accepts_dash_and_underscore() {
  TEST_ASSERT_TRUE(isValidQrPayload("ACS1:-_abcdefghijklmnopqrst"));
}

static void test_rejects_21_and_23_characters_in_the_token() {
  TEST_ASSERT_FALSE(isValidQrPayload("ACS1:q3F8k2Zr1pLw9XbTn0YhV"));
  TEST_ASSERT_FALSE(isValidQrPayload("ACS1:q3F8k2Zr1pLw9XbTn0YhVAx"));
}

static void test_rejects_a_wrong_prefix() {
  TEST_ASSERT_FALSE(isValidQrPayload("ACS2:q3F8k2Zr1pLw9XbTn0YhVA"));
  TEST_ASSERT_FALSE(isValidQrPayload("acs1:q3F8k2Zr1pLw9XbTn0YhVA"));
  TEST_ASSERT_FALSE(isValidQrPayload("XXXXXq3F8k2Zr1pLw9XbTn0YhVA"));
}

static void test_rejects_characters_outside_base64url() {
  TEST_ASSERT_FALSE(isValidQrPayload("ACS1:q3F8k2Zr1pLw9XbTn0Yh+A"));
  TEST_ASSERT_FALSE(isValidQrPayload("ACS1:q3F8k2Zr1pLw9XbTn0Yh/A"));
  TEST_ASSERT_FALSE(isValidQrPayload("ACS1:q3F8k2Zr1pLw9XbTn0Yh=A"));
  TEST_ASSERT_FALSE(isValidQrPayload("ACS1:q3F8k2Zr1pLw9XbTn0Yh A"));
}

static void test_rejects_a_missing_payload() {
  TEST_ASSERT_FALSE(isValidQrPayload(nullptr));
  TEST_ASSERT_FALSE(isValidQrPayload(""));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_accepts_the_contract_example);
  RUN_TEST(test_accepts_dash_and_underscore);
  RUN_TEST(test_rejects_21_and_23_characters_in_the_token);
  RUN_TEST(test_rejects_a_wrong_prefix);
  RUN_TEST(test_rejects_characters_outside_base64url);
  RUN_TEST(test_rejects_a_missing_payload);
  return UNITY_END();
}
