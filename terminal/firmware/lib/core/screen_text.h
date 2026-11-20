#pragma once
#include <stddef.h>

// Texts of the screen (guide, section 6.1): plain ASCII, no accents, at most 20 characters.
constexpr size_t kMaxScreenTextLength = 20;

namespace screen {
extern const char kStarting[];      // "Iniciando..."
extern const char kNoWifi[];        // "Sem Wi-Fi"
extern const char kNoServer[];      // "Sem servidor"
extern const char kInvalidKey[];    // "Chave invalida" (401)
extern const char kDisabled[];      // "Terminal desativado" (403)
extern const char kReadWithApp1[];  // "Leia com", next to the QR
extern const char kReadWithApp2[];  // "o app"
extern const char kGranted[];       // "ACESSO LIBERADO"
extern const char kDenied[];        // "ACESSO NEGADO"
extern const char kTagRead[];       // "Tag lida..."
extern const char kTagEnrolled[];   // "Tag cadastrada"
}  // namespace screen

// Text of a denial code of the contract; "Acesso negado" for a code the terminal does not know yet.
const char* reasonText(const char* code);

// Every text above and every denial text, for the test that checks they fit the screen.
const char* const* allScreenTexts(size_t& count);
