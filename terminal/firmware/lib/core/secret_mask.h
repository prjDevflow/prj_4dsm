#pragma once
#include <stddef.h>

// Loggable form of a secret (terminal key, Wi-Fi password): "****" followed by its last 4 characters,
// or only "****" when it has 8 characters or fewer. An empty or missing secret gives "(vazia)", so a
// missing configuration is still visible in the log.
//
// Writes at most outSize bytes and always ends out with '\0' (nothing is written when outSize is 0).
// Returns out, so it can go straight into a printf argument.
char* maskSecret(const char* secret, char* out, size_t outSize);
