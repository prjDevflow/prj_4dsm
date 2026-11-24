#include "screen_text.h"

#include <string.h>

namespace screen {
const char kStarting[] = "Iniciando...";
const char kNoWifi[] = "Sem Wi-Fi";
const char kNoServer[] = "Sem servidor";
const char kInvalidKey[] = "Chave invalida";
const char kDisabled[] = "Terminal desativado";
const char kReadWithApp1[] = "Leia com";
const char kReadWithApp2[] = "o app";
const char kGranted[] = "ACESSO LIBERADO";
const char kDenied[] = "ACESSO NEGADO";
const char kTagRead[] = "Tag lida...";
const char kTagEnrolled[] = "Tag cadastrada";
}  // namespace screen

namespace {
struct Reason {
  const char* code;
  const char* text;
};

const char kUnknownReason[] = "Acesso negado";

const Reason kReasons[] = {
    {"CREDENCIAL_INVALIDA", "QR invalido"},       {"CREDENCIAL_EXPIRADA", "QR expirado"},
    {"CREDENCIAL_REUTILIZADA", "QR ja usado"},    {"USUARIO_INATIVO", "Cadastro inativo"},
    {"SEM_AUTORIZACAO", "Sem autorizacao"},       {"AUTORIZACAO_CANCELADA", "Autoriz. cancelada"},
    {"FORA_DO_PERIODO", "Fora do horario"},       {"USOS_ESGOTADOS", "Sem entradas"},
    {"DISTANTE_DO_TERMINAL", "Muito longe"},      {"LOCALIZACAO_INVALIDA", "Sem localizacao"},
    {"TAG_DESCONHECIDA", "Tag desconhecida"},     {"TAG_INATIVA", "Tag desativada"},
    {"TERMINAL_OFFLINE", "Sem conexao"},
};
constexpr size_t kReasonCount = sizeof kReasons / sizeof kReasons[0];

const char* const kScreenTexts[] = {
    screen::kStarting, screen::kNoWifi,   screen::kNoServer, screen::kInvalidKey,
    screen::kDisabled, screen::kReadWithApp1, screen::kReadWithApp2, screen::kGranted,
    screen::kDenied,   screen::kTagRead,  screen::kTagEnrolled,
};
constexpr size_t kScreenCount = sizeof kScreenTexts / sizeof kScreenTexts[0];
}  // namespace

const char* reasonText(const char* code) {
  if (code == nullptr) return kUnknownReason;
  for (const Reason& reason : kReasons) {
    if (strcmp(code, reason.code) == 0) return reason.text;
  }
  return kUnknownReason;
}

const char* const* allScreenTexts(size_t& count) {
  static const char* texts[kScreenCount + kReasonCount + 1];
  size_t n = 0;
  for (const char* text : kScreenTexts) texts[n++] = text;
  for (const Reason& reason : kReasons) texts[n++] = reason.text;
  texts[n++] = kUnknownReason;
  count = n;
  return texts;
}
