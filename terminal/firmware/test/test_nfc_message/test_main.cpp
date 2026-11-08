// Body and answer of POST /terminal/nfc (guide, I11; backend B17: lidoEm optional, always 200 with the decision).
#include <string.h>
#include <unity.h>

#include "nfc_message.h"

void setUp() {}
void tearDown() {}

static bool parse(const char* json, NfcDecision& decision) { return parseNfcResponse(json, strlen(json), decision); }

static void test_the_body_has_only_uid_and_lidoEm() {
  char body[96];
  TEST_ASSERT_TRUE(buildNfcJson("04A1B2C3D4", true, 1792506727000LL, body, sizeof body) > 0);
  TEST_ASSERT_EQUAL_STRING("{\"uid\":\"04A1B2C3D4\",\"lidoEm\":\"2026-10-20T14:32:07Z\"}", body);
}

// Before the first heartbeat the terminal has no clock: lidoEm is optional and the server decides by its own.
static void test_without_a_clock_the_body_has_only_the_uid() {
  char body[96];
  TEST_ASSERT_TRUE(buildNfcJson("04A1B2C3D4", false, 0, body, sizeof body) > 0);
  TEST_ASSERT_EQUAL_STRING("{\"uid\":\"04A1B2C3D4\"}", body);
}

static void test_a_small_buffer_gives_zero() {
  char body[10];
  TEST_ASSERT_EQUAL_UINT32(0, buildNfcJson("04A1B2C3D4", true, 1792506727000LL, body, sizeof body));
  TEST_ASSERT_EQUAL_STRING("", body);
}

static void test_reads_an_authorization() {
  NfcDecision decision;
  TEST_ASSERT_TRUE(parse("{\"resultado\":\"AUTORIZADO\",\"aberturaMs\":5000}", decision));
  TEST_ASSERT_TRUE(decision.result == NfcResult::Authorized);
  TEST_ASSERT_EQUAL_UINT32(5000, decision.openMs);
  TEST_ASSERT_TRUE(decision.recognized);
}

static void test_an_authorization_without_aberturaMs_leaves_it_to_the_config() {
  NfcDecision decision;
  TEST_ASSERT_TRUE(parse("{\"resultado\":\"AUTORIZADO\"}", decision));
  TEST_ASSERT_EQUAL_UINT32(0, decision.openMs);
}

static void test_reads_a_denial_with_its_reason() {
  NfcDecision decision;
  TEST_ASSERT_TRUE(parse("{\"resultado\":\"NEGADO\",\"motivo\":\"TAG_DESCONHECIDA\"}", decision));
  TEST_ASSERT_TRUE(decision.result == NfcResult::Denied);
  TEST_ASSERT_EQUAL_STRING("TAG_DESCONHECIDA", decision.reason);
}

static void test_reads_an_enrollment() {
  NfcDecision decision;
  TEST_ASSERT_TRUE(parse("{\"resultado\":\"CADASTRADA\"}", decision));
  TEST_ASSERT_TRUE(decision.result == NfcResult::Enrolled);
}

// A result the terminal does not know yet never opens the turnstile.
static void test_an_unknown_result_counts_as_denied() {
  NfcDecision decision;
  TEST_ASSERT_TRUE(parse("{\"resultado\":\"PENSANDO\",\"aberturaMs\":5000}", decision));
  TEST_ASSERT_TRUE(decision.result == NfcResult::Denied);
  TEST_ASSERT_FALSE(decision.recognized);
  TEST_ASSERT_EQUAL_STRING("", decision.reason);
}

static void test_malformed_answers_are_refused() {
  NfcDecision decision;
  const char* const answers[] = {"{", "[]", "{}", "{\"resultado\":5}"};
  for (const char* json : answers) TEST_ASSERT_FALSE_MESSAGE(parse(json, decision), json);
  TEST_ASSERT_FALSE(parseNfcResponse(nullptr, 0, decision));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_the_body_has_only_uid_and_lidoEm);
  RUN_TEST(test_without_a_clock_the_body_has_only_the_uid);
  RUN_TEST(test_a_small_buffer_gives_zero);
  RUN_TEST(test_reads_an_authorization);
  RUN_TEST(test_an_authorization_without_aberturaMs_leaves_it_to_the_config);
  RUN_TEST(test_reads_a_denial_with_its_reason);
  RUN_TEST(test_reads_an_enrollment);
  RUN_TEST(test_an_unknown_result_counts_as_denied);
  RUN_TEST(test_malformed_answers_are_refused);
  return UNITY_END();
}
