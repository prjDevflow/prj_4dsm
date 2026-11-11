#pragma once
// Text for the reason of the last restart, logged at boot. A "brownout" right after the servo moves
// points to the power supply (guide, section 2.2 and question 9).

#include <esp_system.h>

inline const char* resetReasonText(esp_reset_reason_t reason) {
  switch (reason) {
    case ESP_RST_POWERON:
      return "ligado na energia";
    case ESP_RST_EXT:
      return "pino de reset";
    case ESP_RST_SW:
      return "reinicio por software";
    case ESP_RST_PANIC:
      return "erro no firmware (panic)";
    case ESP_RST_INT_WDT:
    case ESP_RST_TASK_WDT:
    case ESP_RST_WDT:
      return "watchdog";
    case ESP_RST_DEEPSLEEP:
      return "saida do deep sleep";
    case ESP_RST_BROWNOUT:
      return "queda de tensao (brownout)";
    default:
      return "desconhecido";
  }
}
