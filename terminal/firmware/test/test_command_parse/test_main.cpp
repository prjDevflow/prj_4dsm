// Answer of GET /terminal/commands (guide, I08; backend doc 03, section 4.5, and STATUS question #11).
#include <string.h>
#include <unity.h>

#include "command_parse.h"

void setUp() {}
void tearDown() {}

static bool parse(const char* json, TerminalCommand* out, size_t capacity, size_t& count) {
  return parseCommands(json, strlen(json), out, capacity, count);
}

static void test_reads_the_contract_example() {
  const char json[] =
      "{\"commands\":[{\"id\":42,\"tipo\":\"ABRIR\",\"aberturaMs\":5000,\"criadoEm\":\"2026-10-20T14:32:07.123Z\"},"
      "{\"id\":43,\"tipo\":\"NEGAR\",\"motivo\":\"DISTANTE_DO_TERMINAL\",\"criadoEm\":\"2026-10-20T14:32:08.456Z\"}]}";
  TerminalCommand commands[kMaxCommandsPerPoll];
  size_t count = 0;
  TEST_ASSERT_TRUE(parse(json, commands, kMaxCommandsPerPoll, count));
  TEST_ASSERT_EQUAL_UINT32(2, count);
  TEST_ASSERT_EQUAL_UINT32(42, commands[0].id);
  TEST_ASSERT_TRUE(commands[0].type == CommandType::Open);
  TEST_ASSERT_EQUAL_UINT32(5000, commands[0].openMs);
  TEST_ASSERT_TRUE(commands[0].hasCreatedAt);
  TEST_ASSERT_EQUAL_INT64(1792506727123LL, commands[0].createdAtMs);
  TEST_ASSERT_EQUAL_UINT32(43, commands[1].id);
  TEST_ASSERT_TRUE(commands[1].type == CommandType::Deny);
  TEST_ASSERT_EQUAL_STRING("DISTANTE_DO_TERMINAL", commands[1].reason);
  TEST_ASSERT_EQUAL_UINT32(0, commands[1].openMs);
}

static void test_an_empty_list_is_the_normal_answer() {
  TerminalCommand commands[kMaxCommandsPerPoll];
  size_t count = 99;
  TEST_ASSERT_TRUE(parse("{\"commands\":[]}", commands, kMaxCommandsPerPoll, count));
  TEST_ASSERT_EQUAL_UINT32(0, count);
}

// Ids are global across terminals: gaps (41, 47) are normal, and the order is by number.
static void test_commands_come_out_in_increasing_id_order() {
  const char json[] =
      "{\"commands\":[{\"id\":47,\"tipo\":\"ABRIR\",\"aberturaMs\":5000},{\"id\":10,\"tipo\":\"NEGAR\",\"motivo\":\"X\"},"
      "{\"id\":9,\"tipo\":\"NEGAR\",\"motivo\":\"Y\"}]}";
  TerminalCommand commands[kMaxCommandsPerPoll];
  size_t count = 0;
  TEST_ASSERT_TRUE(parse(json, commands, kMaxCommandsPerPoll, count));
  TEST_ASSERT_EQUAL_UINT32(3, count);
  TEST_ASSERT_EQUAL_UINT32(9, commands[0].id);
  TEST_ASSERT_EQUAL_UINT32(10, commands[1].id);
  TEST_ASSERT_EQUAL_UINT32(47, commands[2].id);
}

static void test_an_unknown_type_is_kept_as_unknown() {
  TerminalCommand commands[kMaxCommandsPerPoll];
  size_t count = 0;
  TEST_ASSERT_TRUE(parse("{\"commands\":[{\"id\":5,\"tipo\":\"PISCAR\"}]}", commands, kMaxCommandsPerPoll, count));
  TEST_ASSERT_EQUAL_UINT32(1, count);
  TEST_ASSERT_TRUE(commands[0].type == CommandType::Unknown);
  TEST_ASSERT_FALSE(commands[0].hasCreatedAt);
}

static void test_items_without_a_valid_id_are_skipped() {
  const char json[] =
      "{\"commands\":[{\"tipo\":\"ABRIR\"},{\"id\":\"42\",\"tipo\":\"ABRIR\"},{\"id\":0,\"tipo\":\"ABRIR\"},"
      "{\"id\":-1,\"tipo\":\"ABRIR\"},{\"id\":7,\"tipo\":\"ABRIR\"}]}";
  TerminalCommand commands[kMaxCommandsPerPoll];
  size_t count = 0;
  TEST_ASSERT_TRUE(parse(json, commands, kMaxCommandsPerPoll, count));
  TEST_ASSERT_EQUAL_UINT32(1, count);
  TEST_ASSERT_EQUAL_UINT32(7, commands[0].id);
}

// With more commands than room, the lowest ids stay: the next poll (after = the highest kept) brings the rest.
static void test_with_more_than_the_capacity_the_lowest_ids_stay() {
  const char json[] =
      "{\"commands\":[{\"id\":30,\"tipo\":\"ABRIR\"},{\"id\":10,\"tipo\":\"ABRIR\"},{\"id\":20,\"tipo\":\"ABRIR\"}]}";
  TerminalCommand commands[2];
  size_t count = 0;
  TEST_ASSERT_TRUE(parse(json, commands, 2, count));
  TEST_ASSERT_EQUAL_UINT32(2, count);
  TEST_ASSERT_EQUAL_UINT32(10, commands[0].id);
  TEST_ASSERT_EQUAL_UINT32(20, commands[1].id);
}

static void test_a_long_reason_is_cut_to_fit() {
  const char json[] =
      "{\"commands\":[{\"id\":5,\"tipo\":\"NEGAR\",\"motivo\":\"UM_CODIGO_MUITO_MAIS_COMPRIDO_DO_QUE_O_ESPACO\"}]}";
  TerminalCommand commands[kMaxCommandsPerPoll];
  size_t count = 0;
  TEST_ASSERT_TRUE(parse(json, commands, kMaxCommandsPerPoll, count));
  TEST_ASSERT_EQUAL_UINT32(kMaxReasonLength, strlen(commands[0].reason));
}

static void test_malformed_answers_are_refused() {
  TerminalCommand commands[kMaxCommandsPerPoll];
  size_t count = 0;
  const char* const answers[] = {"{", "[]", "{\"commands\":5}", "{}"};
  for (const char* json : answers) TEST_ASSERT_FALSE_MESSAGE(parse(json, commands, kMaxCommandsPerPoll, count), json);
  TEST_ASSERT_FALSE(parseCommands(nullptr, 0, commands, kMaxCommandsPerPoll, count));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_reads_the_contract_example);
  RUN_TEST(test_an_empty_list_is_the_normal_answer);
  RUN_TEST(test_commands_come_out_in_increasing_id_order);
  RUN_TEST(test_an_unknown_type_is_kept_as_unknown);
  RUN_TEST(test_items_without_a_valid_id_are_skipped);
  RUN_TEST(test_with_more_than_the_capacity_the_lowest_ids_stay);
  RUN_TEST(test_a_long_reason_is_cut_to_fit);
  RUN_TEST(test_malformed_answers_are_refused);
  return UNITY_END();
}
