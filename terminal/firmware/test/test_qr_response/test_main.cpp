// Answer of POST /terminal/qr read into what the terminal needs (guide, I06; backend doc 03, section 4.5).
#include <string.h>
#include <unity.h>

#include "qr_response.h"

void setUp() {}
void tearDown() {}

static const char kContractExample[] =
    "{\"payload\":\"ACS1:q3F8k2Zr1pLw9XbTn0YhVA\",\"emitidoEm\":\"2026-10-20T14:32:07.000Z\","
    "\"expiraEm\":\"2026-10-20T14:32:22.000Z\",\"renovarEmMs\":10000}";

static bool parse(const char* json, QrResponse& out) { return parseQrResponse(json, strlen(json), out); }

static void test_reads_the_contract_example() {
  QrResponse qr;
  TEST_ASSERT_TRUE(parse(kContractExample, qr));
  TEST_ASSERT_EQUAL_STRING("ACS1:q3F8k2Zr1pLw9XbTn0YhVA", qr.payload);
  TEST_ASSERT_EQUAL_UINT32(15000, qr.validityMs);
  TEST_ASSERT_EQUAL_UINT32(10000, qr.refreshMs);
}

static void test_dates_to_the_second_also_work() {
  QrResponse qr;
  TEST_ASSERT_TRUE(parse("{\"payload\":\"ACS1:q3F8k2Zr1pLw9XbTn0YhVA\",\"emitidoEm\":\"2026-10-20T14:32:07Z\","
                         "\"expiraEm\":\"2026-10-20T14:32:22Z\",\"renovarEmMs\":10000}",
                         qr));
  TEST_ASSERT_EQUAL_UINT32(15000, qr.validityMs);
}

static void test_unknown_fields_are_ignored() {
  QrResponse qr;
  TEST_ASSERT_TRUE(parse("{\"payload\":\"ACS1:q3F8k2Zr1pLw9XbTn0YhVA\",\"emitidoEm\":\"2026-10-20T14:32:07.000Z\","
                         "\"expiraEm\":\"2026-10-20T14:32:22.000Z\",\"renovarEmMs\":10000,\"novo\":true}",
                         qr));
}

static void test_a_payload_out_of_the_contract_is_refused() {
  QrResponse qr;
  TEST_ASSERT_FALSE(parse("{\"payload\":\"ACS1:curto\",\"emitidoEm\":\"2026-10-20T14:32:07.000Z\","
                          "\"expiraEm\":\"2026-10-20T14:32:22.000Z\",\"renovarEmMs\":10000}",
                          qr));
  TEST_ASSERT_FALSE(parse("{\"payload\":42,\"emitidoEm\":\"2026-10-20T14:32:07.000Z\","
                          "\"expiraEm\":\"2026-10-20T14:32:22.000Z\",\"renovarEmMs\":10000}",
                          qr));
}

static void test_missing_or_broken_dates_are_refused() {
  QrResponse qr;
  TEST_ASSERT_FALSE(parse("{\"payload\":\"ACS1:q3F8k2Zr1pLw9XbTn0YhVA\",\"emitidoEm\":\"2026-10-20T14:32:07.000Z\","
                          "\"renovarEmMs\":10000}",
                          qr));
  TEST_ASSERT_FALSE(parse("{\"payload\":\"ACS1:q3F8k2Zr1pLw9XbTn0YhVA\",\"emitidoEm\":\"ontem\","
                          "\"expiraEm\":\"2026-10-20T14:32:22.000Z\",\"renovarEmMs\":10000}",
                          qr));
}

static void test_an_expiry_not_after_the_issue_is_refused() {
  QrResponse qr;
  TEST_ASSERT_FALSE(parse("{\"payload\":\"ACS1:q3F8k2Zr1pLw9XbTn0YhVA\",\"emitidoEm\":\"2026-10-20T14:32:07.000Z\","
                          "\"expiraEm\":\"2026-10-20T14:32:07.000Z\",\"renovarEmMs\":10000}",
                          qr));
  TEST_ASSERT_FALSE(parse("{\"payload\":\"ACS1:q3F8k2Zr1pLw9XbTn0YhVA\",\"emitidoEm\":\"2026-10-20T14:32:22.000Z\","
                          "\"expiraEm\":\"2026-10-20T14:32:07.000Z\",\"renovarEmMs\":10000}",
                          qr));
}

// A QR is valid for seconds (15 s in the contract). Anything above five minutes is a broken answer.
static void test_a_validity_above_five_minutes_is_refused() {
  QrResponse qr;
  TEST_ASSERT_FALSE(parse("{\"payload\":\"ACS1:q3F8k2Zr1pLw9XbTn0YhVA\",\"emitidoEm\":\"2026-10-20T14:32:07.000Z\","
                          "\"expiraEm\":\"2026-10-20T14:42:07.000Z\",\"renovarEmMs\":10000}",
                          qr));
}

// Without a usable renovarEmMs the firmware keeps the default of the guide (section 5.4): 10 s.
static void test_a_missing_or_odd_refresh_uses_the_default() {
  const char* const answers[] = {
      "{\"payload\":\"ACS1:q3F8k2Zr1pLw9XbTn0YhVA\",\"emitidoEm\":\"2026-10-20T14:32:07.000Z\","
      "\"expiraEm\":\"2026-10-20T14:32:22.000Z\"}",
      "{\"payload\":\"ACS1:q3F8k2Zr1pLw9XbTn0YhVA\",\"emitidoEm\":\"2026-10-20T14:32:07.000Z\","
      "\"expiraEm\":\"2026-10-20T14:32:22.000Z\",\"renovarEmMs\":0}",
      "{\"payload\":\"ACS1:q3F8k2Zr1pLw9XbTn0YhVA\",\"emitidoEm\":\"2026-10-20T14:32:07.000Z\","
      "\"expiraEm\":\"2026-10-20T14:32:22.000Z\",\"renovarEmMs\":-5}",
      "{\"payload\":\"ACS1:q3F8k2Zr1pLw9XbTn0YhVA\",\"emitidoEm\":\"2026-10-20T14:32:07.000Z\","
      "\"expiraEm\":\"2026-10-20T14:32:22.000Z\",\"renovarEmMs\":\"10000\"}",
      "{\"payload\":\"ACS1:q3F8k2Zr1pLw9XbTn0YhVA\",\"emitidoEm\":\"2026-10-20T14:32:07.000Z\","
      "\"expiraEm\":\"2026-10-20T14:32:22.000Z\",\"renovarEmMs\":600000}",
  };
  for (const char* json : answers) {
    QrResponse qr;
    TEST_ASSERT_TRUE_MESSAGE(parse(json, qr), json);
    TEST_ASSERT_EQUAL_UINT32_MESSAGE(kDefaultQrRefreshMs, qr.refreshMs, json);
  }
}

static void test_malformed_json_is_refused() {
  QrResponse qr;
  TEST_ASSERT_FALSE(parse("{", qr));
  TEST_ASSERT_FALSE(parse("", qr));
  TEST_ASSERT_FALSE(parse("[]", qr));
  TEST_ASSERT_FALSE(parse("null", qr));
  TEST_ASSERT_FALSE(parseQrResponse(nullptr, 0, qr));
}

// Nothing is drawn from a refused answer: the previous QR stays as it was.
static void test_a_refused_answer_leaves_the_output_untouched() {
  QrResponse qr;
  TEST_ASSERT_TRUE(parse(kContractExample, qr));
  TEST_ASSERT_FALSE(parse("{\"payload\":\"ACS1:-_abcdefghijklmnopqrst\",\"emitidoEm\":\"2026-10-20T14:32:07.000Z\"}", qr));
  TEST_ASSERT_EQUAL_STRING("ACS1:q3F8k2Zr1pLw9XbTn0YhVA", qr.payload);
  TEST_ASSERT_EQUAL_UINT32(15000, qr.validityMs);
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_reads_the_contract_example);
  RUN_TEST(test_dates_to_the_second_also_work);
  RUN_TEST(test_unknown_fields_are_ignored);
  RUN_TEST(test_a_payload_out_of_the_contract_is_refused);
  RUN_TEST(test_missing_or_broken_dates_are_refused);
  RUN_TEST(test_an_expiry_not_after_the_issue_is_refused);
  RUN_TEST(test_a_validity_above_five_minutes_is_refused);
  RUN_TEST(test_a_missing_or_odd_refresh_uses_the_default);
  RUN_TEST(test_malformed_json_is_refused);
  RUN_TEST(test_a_refused_answer_leaves_the_output_untouched);
  return UNITY_END();
}
