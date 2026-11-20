# Terminal de acesso (IoT)

Hardware e firmware do terminal da catraca: ESP32 DevKit V1 com display OLED para o QR Code, leitor NFC
RC522, GPS NEO-6M, buzzer e servo. Fala com a API por HTTP, autenticado pela chave do terminal
(`X-Terminal-Id` e `X-Terminal-Key`).

| Pasta | Conteúdo |
|---|---|
| [firmware/](firmware/) | projeto PlatformIO: firmware, ferramenta de bancada e testes |
| [docs/](docs/) | [pinagem](docs/pinagem.md) (ligações de cada peça com o ESP32), [guia do firmware](docs/guia-firmware.md) (etapas I01 a I15) e [índice](docs/README.md) |

Responsável: Matheus (hardware e firmware).
