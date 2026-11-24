// Texts of the screen and of each denial code (guide, section 6.1).
#include <string.h>
#include <unity.h>

#include "screen_text.h"

void setUp() {}
void tearDown() {}

static void test_each_denial_code_has_its_text() {
  const char* const pairs[][2] = {
      {"CREDENCIAL_INVALIDA", "QR invalido"},       {"CREDENCIAL_EXPIRADA", "QR expirado"},
      {"CREDENCIAL_REUTILIZADA", "QR ja usado"},    {"USUARIO_INATIVO", "Cadastro inativo"},
      {"SEM_AUTORIZACAO", "Sem autorizacao"},       {"AUTORIZACAO_CANCELADA", "Autoriz. cancelada"},
      {"FORA_DO_PERIODO", "Fora do horario"},       {"USOS_ESGOTADOS", "Sem entradas"},
      {"DISTANTE_DO_TERMINAL", "Muito longe"},      {"LOCALIZACAO_INVALIDA", "Sem localizacao"},
      {"TAG_DESCONHECIDA", "Tag desconhecida"},     {"TAG_INATIVA", "Tag desativada"},
      {"TERMINAL_OFFLINE", "Sem conexao"},
  };
  for (const auto& pair : pairs) TEST_ASSERT_EQUAL_STRING_MESSAGE(pair[1], reasonText(pair[0]), pair[0]);
}

static void test_an_unknown_or_missing_code_says_access_denied() {
  TEST_ASSERT_EQUAL_STRING("Acesso negado", reasonText("CODIGO_NOVO"));
  TEST_ASSERT_EQUAL_STRING("Acesso negado", reasonText(""));
  TEST_ASSERT_EQUAL_STRING("Acesso negado", reasonText(nullptr));
}

static void test_every_text_is_plain_ascii_and_fits_20_characters() {
  size_t count = 0;
  const char* const* texts = allScreenTexts(count);
  TEST_ASSERT_TRUE(count >= 20);
  for (size_t i = 0; i < count; ++i) {
    TEST_ASSERT_TRUE_MESSAGE(strlen(texts[i]) <= kMaxScreenTextLength, texts[i]);
    for (const char* p = texts[i]; *p != '\0'; ++p) TEST_ASSERT_TRUE_MESSAGE(*p >= 0x20 && *p <= 0x7E, texts[i]);
  }
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_each_denial_code_has_its_text);
  RUN_TEST(test_an_unknown_or_missing_code_says_access_denied);
  RUN_TEST(test_every_text_is_plain_ascii_and_fits_20_characters);
  return UNITY_END();
}
