// Size of the QR modules on the 64 px square of the OLED (guide, I06).
#include <unity.h>

#include "qr_layout.h"

void setUp() {}
void tearDown() {}

static void test_version_2_gets_2_px_modules_and_a_7_px_margin() {
  const QrLayout layout = layoutQr(64, 25);
  TEST_ASSERT_EQUAL_INT(2, layout.modulePx);
  TEST_ASSERT_EQUAL_INT(7, layout.offsetPx);
}

// 33 modules is version 4: 1 px per module, which the phones cannot read, so the firmware refuses it.
static void test_a_bigger_qr_falls_below_the_minimum() {
  const QrLayout layout = layoutQr(64, 33);
  TEST_ASSERT_EQUAL_INT(1, layout.modulePx);
  TEST_ASSERT_EQUAL_INT(15, layout.offsetPx);
  TEST_ASSERT_TRUE(layout.modulePx < kMinQrModulePx);
}

static void test_version_1_would_fill_the_square_with_3_px_modules() {
  const QrLayout layout = layoutQr(64, 21);
  TEST_ASSERT_EQUAL_INT(3, layout.modulePx);
  TEST_ASSERT_EQUAL_INT(0, layout.offsetPx);
}

static void test_nothing_to_draw_gives_an_empty_layout() {
  const QrLayout noModules = layoutQr(64, 0);
  TEST_ASSERT_EQUAL_INT(0, noModules.modulePx);
  TEST_ASSERT_EQUAL_INT(0, noModules.offsetPx);
  const QrLayout noArea = layoutQr(0, 25);
  TEST_ASSERT_EQUAL_INT(0, noArea.modulePx);
  TEST_ASSERT_EQUAL_INT(0, noArea.offsetPx);
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_version_2_gets_2_px_modules_and_a_7_px_margin);
  RUN_TEST(test_a_bigger_qr_falls_below_the_minimum);
  RUN_TEST(test_version_1_would_fill_the_square_with_3_px_modules);
  RUN_TEST(test_nothing_to_draw_gives_an_empty_layout);
  return UNITY_END();
}
