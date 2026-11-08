#pragma once
#include <stddef.h>
#include <stdint.h>

// A command of GET /terminal/commands (backend doc 03, section 4.5; STATUS question #11): ABRIR brings
// aberturaMs, NEGAR brings motivo, and criadoEm comes in ISO with milliseconds.
enum class CommandType : uint8_t { Open, Deny, Unknown };

constexpr size_t kMaxCommandsPerPoll = 10;  // the limit the terminal asks for
constexpr size_t kMaxReasonLength = 31;     // the longest code of the contract has 22 characters

struct TerminalCommand {
  uint32_t id;  // global increasing integer: gaps between the ids of one terminal are normal
  CommandType type;
  uint32_t openMs;  // 0 when absent: the terminal uses config.aberturaMs
  char reason[kMaxReasonLength + 1];
  bool hasCreatedAt;
  int64_t createdAtMs;
};

// Reads the answer into out, in increasing id order (compared as numbers). Items without a positive integer
// id are skipped. With more commands than capacity, the lowest ids stay: the next poll brings the rest.
// False only when the answer is not {"commands": [...]}.
bool parseCommands(const char* json, size_t length, TerminalCommand* out, size_t capacity, size_t& count);
