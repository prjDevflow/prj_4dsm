// Body and answer of POST /terminal/heartbeat (guide, I05; backend doc 03, section 4.5).
#include <ArduinoJson.h>

#include <string.h>
#include <unity.h>

#include "heartbeat_message.h"

void setUp() {}
void tearDown() {}

static HeartbeatData sampleData() {
  HeartbeatData data;
  data.hasPosition = false;
  data.latitude = 0;
  data.longitude = 0;
  data.gpsFix = false;
  data.gpsSimulated = false;
  data.firmware = "0.3.0";
  data.uptimeS = 1234;
  data.wifiRssi = -61;
  data.pendingEvents = 0;
  return data;
}

static void test_the_body_has_exactly_the_eight_fields_of_the_contract() {
  char body[256];
  TEST_ASSERT_TRUE(buildHeartbeatJson(sampleData(), body, sizeof body) > 0);
  JsonDocument doc;
  TEST_ASSERT_TRUE(deserializeJson(doc, body) == DeserializationError::Ok);
  const JsonObjectConst object = doc.as<JsonObjectConst>();
  TEST_ASSERT_EQUAL_UINT32(8, object.size());
  const char* const keys[] = {"latitude", "longitude", "gpsFix", "gpsSimulado",
                              "firmware", "uptimeS",   "wifiRssi", "eventosPendentes"};
  for (JsonPairConst pair : object) {
    bool known = false;
    for (const char* key : keys) known = known || strcmp(pair.key().c_str(), key) == 0;
    TEST_ASSERT_TRUE_MESSAGE(known, pair.key().c_str());
  }
  TEST_ASSERT_EQUAL_STRING("0.3.0", object["firmware"]);
  TEST_ASSERT_EQUAL_UINT32(1234, object["uptimeS"].as<uint32_t>());
  TEST_ASSERT_EQUAL_INT(-61, object["wifiRssi"].as<int>());
  TEST_ASSERT_EQUAL_UINT32(0, object["eventosPendentes"].as<uint32_t>());
}

// Without a fix the coordinates go as null (guide question 2, answered by the B11).
static void test_without_a_position_the_coordinates_are_null() {
  char body[256];
  buildHeartbeatJson(sampleData(), body, sizeof body);
  JsonDocument doc;
  deserializeJson(doc, body);
  TEST_ASSERT_TRUE(doc["latitude"].isNull());
  TEST_ASSERT_TRUE(doc["longitude"].isNull());
  TEST_ASSERT_FALSE(doc["gpsFix"].as<bool>());
  TEST_ASSERT_FALSE(doc["gpsSimulado"].as<bool>());
}

static void test_fixed_coordinates_go_as_simulated_gps() {
  HeartbeatData data = sampleData();
  data.hasPosition = true;
  data.latitude = -23.30512;
  data.longitude = -45.96551;
  data.gpsFix = true;
  data.gpsSimulated = true;
  char body[256];
  buildHeartbeatJson(data, body, sizeof body);
  // The text that reaches the backend, digit by digit: reading it back with ArduinoJson would keep only a
  // float, which near 45 is off by up to 2e-6.
  TEST_ASSERT_NOT_NULL(strstr(body, "\"latitude\":-23.30512,"));
  TEST_ASSERT_NOT_NULL(strstr(body, "\"longitude\":-45.96551,"));
  JsonDocument doc;
  deserializeJson(doc, body);
  TEST_ASSERT_TRUE(doc["gpsFix"].as<bool>());
  TEST_ASSERT_TRUE(doc["gpsSimulado"].as<bool>());
}

static void test_a_small_buffer_gives_zero() {
  char body[16];
  TEST_ASSERT_EQUAL_UINT32(0, buildHeartbeatJson(sampleData(), body, sizeof body));
}

static void test_reads_server_time_and_config_of_the_contract() {
  const char json[] =
      "{\"serverTime\":\"2026-10-20T14:32:07Z\","
      "\"config\":{\"qrRefreshMs\":10000,\"commandPollMs\":1000,\"aberturaMs\":5000}}";
  int64_t serverTimeMs = 0;
  TerminalConfig config;
  TEST_ASSERT_TRUE(parseHeartbeatResponse(json, strlen(json), serverTimeMs, config));
  TEST_ASSERT_EQUAL_INT64(1792506727000LL, serverTimeMs);
  TEST_ASSERT_EQUAL_UINT32(10000, config.qrRefreshMs);
  TEST_ASSERT_EQUAL_UINT32(1000, config.commandPollMs);
  TEST_ASSERT_EQUAL_UINT32(5000, config.openMs);
}

static void test_a_missing_config_keeps_the_defaults() {
  const char json[] = "{\"serverTime\":\"2026-10-20T14:32:07Z\"}";
  int64_t serverTimeMs = 0;
  TerminalConfig config;
  config.qrRefreshMs = 1;
  config.commandPollMs = 1;
  config.openMs = 1;
  TEST_ASSERT_TRUE(parseHeartbeatResponse(json, strlen(json), serverTimeMs, config));
  TEST_ASSERT_EQUAL_UINT32(10000, config.qrRefreshMs);
  TEST_ASSERT_EQUAL_UINT32(1000, config.commandPollMs);
  TEST_ASSERT_EQUAL_UINT32(5000, config.openMs);
}

// Each field falls back to its own default when it is missing, not a number or out of a sane range.
static void test_a_missing_or_odd_config_field_uses_its_default() {
  const char json[] =
      "{\"serverTime\":\"2026-10-20T14:32:07Z\","
      "\"config\":{\"commandPollMs\":500,\"aberturaMs\":\"muito\",\"qrRefreshMs\":999999}}";
  int64_t serverTimeMs = 0;
  TerminalConfig config;
  TEST_ASSERT_TRUE(parseHeartbeatResponse(json, strlen(json), serverTimeMs, config));
  TEST_ASSERT_EQUAL_UINT32(10000, config.qrRefreshMs);
  TEST_ASSERT_EQUAL_UINT32(500, config.commandPollMs);
  TEST_ASSERT_EQUAL_UINT32(5000, config.openMs);
}

static void test_an_answer_without_a_valid_server_time_is_refused() {
  int64_t serverTimeMs = 0;
  TerminalConfig config;
  const char* const answers[] = {"{\"config\":{}}", "{\"serverTime\":\"ontem\"}", "{", "[]"};
  for (const char* json : answers) {
    TEST_ASSERT_FALSE_MESSAGE(parseHeartbeatResponse(json, strlen(json), serverTimeMs, config), json);
  }
  TEST_ASSERT_FALSE(parseHeartbeatResponse(nullptr, 0, serverTimeMs, config));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_the_body_has_exactly_the_eight_fields_of_the_contract);
  RUN_TEST(test_without_a_position_the_coordinates_are_null);
  RUN_TEST(test_fixed_coordinates_go_as_simulated_gps);
  RUN_TEST(test_a_small_buffer_gives_zero);
  RUN_TEST(test_reads_server_time_and_config_of_the_contract);
  RUN_TEST(test_a_missing_config_keeps_the_defaults);
  RUN_TEST(test_a_missing_or_odd_config_field_uses_its_default);
  RUN_TEST(test_an_answer_without_a_valid_server_time_is_refused);
  return UNITY_END();
}
