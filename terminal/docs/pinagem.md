# Pinagem do terminal

Ligações de cada peça com o ESP32 DevKit V1 (30 pinos). Fonte: o mapeamento do
[relatório de firmware](relatorio-firmware-terminal-esp32.pdf) (06/11/2026, páginas 2 e 3). No código, os
números de pino ficam só em [`firmware/include/pins.h`](../firmware/include/pins.h).

Siga o nome serigrafado na placa, não a posição do pino: a ordem muda entre fabricantes.

## Ligações

| Peça | Pino da peça | Liga em | Constante no código | Interface |
|---|---|---|---|---|
| RC522 (NFC) | SDA (SS) | GPIO 5 | `PIN_RC522_SS` | SPI |
| | SCK | GPIO 18 | `PIN_RC522_SCK` | SPI |
| | MOSI | GPIO 23 | `PIN_RC522_MOSI` | SPI |
| | MISO | GPIO 19 | `PIN_RC522_MISO` | SPI |
| | RST | GPIO 4 | `PIN_RC522_RST` | saída digital |
| | IRQ | não ligar | — | — |
| | 3.3V / GND | trilho +3V3 / GND | — | — |
| Display OLED 128×64 (driver SH1106) | SDA | GPIO 21 | `PIN_OLED_SDA` | I2C, endereço `0x3C` |
| | SCL | GPIO 22 | `PIN_OLED_SCL` | I2C |
| | VCC / GND | trilho +3V3 / GND | — | — |
| GPS NEO-6M | TX do GPS | GPIO 16 (RX2) | `PIN_GPS_RX` | UART2, 9600 bps |
| | RX do GPS | GPIO 17 (TX2) | `PIN_GPS_TX` | UART2 |
| | VCC / GND | trilho +3V3 / GND | — | — |
| Servo SG90 ou MG90S (catraca) | laranja (sinal) | GPIO 13 | `PIN_SERVO` | PWM 50 Hz |
| | vermelho | trilho +5V (VIN) | — | — |
| | marrom | trilho GND | — | — |
| Buzzer (passivo) | (+) | GPIO 27 | `PIN_BUZZER` | PWM: o buzzer passivo só soa com tom |
| | (−) | GND | — | — |
| Capacitor 470 µF | + / faixa (−) | trilho +5V / GND | — | — |
| ESP32 | VIN (5 V do USB) | trilho +5V | — | — |
| | 3V3 | trilho +3V3 | — | — |
| | GND (os dois) | trilhos GND | — | — |

- **Livres:** GPIO 25 e 26. Eram dos LEDs, que não fazem parte desta montagem; podem voltar a ser usados.
- O GPIO 5 é pino de boot do ESP32, mas funciona bem como SS do RC522.
- O TX de um lado vai no RX do outro: o TX do GPS entra no RX2 do ESP32 (GPIO 16).
- O LED azul da própria placa (GPIO 2, `PIN_LED_BUILTIN`) não é uma ligação: o firmware só o pisca para mostrar
  que o laço está rodando.

## Trilhos da protoboard

Em cada par de trilhos, o GND é a linha de cima e o + é a linha de baixo. O par de cima é GND / +5V; o de baixo,
GND / +3V3.

## Regras elétricas

- **3,3 V:** RC522, OLED e GPS ficam no trilho +3V3. O RC522 queima com 5 V.
- **5 V:** só o servo usa o trilho +5V, que vem do pino VIN (5 V do USB). Nunca ligue o servo no 3V3.
- **Capacitor de 470 µF** no trilho de 5 V, com a faixa (−) no GND. Ele segura a tensão quando o servo arranca;
  sem ele o ESP32 pode reiniciar ("Brownout detector was triggered").
- **GND comum:** todos os GND (ESP32, módulos, servo, buzzer e capacitor) ligados entre si.
- **Alimentação:** cabo USB de dados direto no computador ou num power bank. Uma porta USB 2.0 entrega cerca de
  500 mA, então não force a catraca com a mão.
- **Se precisar remanejar um fio,** evite os GPIO 6 a 11 (memória flash), 34 a 39 (só entrada) e 0, 2, 12 e 15
  (definem o modo de boot). Mudou um fio: mude também o `pins.h` e esta tabela.
