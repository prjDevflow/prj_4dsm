# Firmware do terminal de acesso

Firmware do ESP32 DevKit V1 da catraca: mostra o QR Code gerado pelo backend, lê tags NFC, sinaliza
com LEDs e buzzer e move o servo que representa a catraca. Projeto PlatformIO com o core Arduino 2.0.17
(`platformio/espressif32@7.1.3`).

Estado: **I03** (esqueleto do projeto, log com níveis e Wi-Fi que reconecta sozinho).

## Instalar

1. **PlatformIO:** a extensão *PlatformIO IDE* do VS Code, ou só a linha de comando:
   `pip install platformio==6.2.0`. Instalado pelo pip, se o comando `pio` não for encontrado, use
   `python -m platformio` no lugar dele.
2. **Driver USB da placa:** CP210x ou CH340, conforme o chip ao lado do conector USB.
3. **Segredos:** copie o modelo e preencha a rede Wi-Fi e a URL do backend.

   ```bash
   cp include/secrets.example.h include/secrets.h
   ```

   O `secrets.h` está no `.gitignore` e nunca vai para o repositório. O modelo já traz o id e a chave
   do terminal do seed (públicos, ver `backend/docs/ambiente-dev.md`), que só valem contra o backend local.

## Comandos

Rode dentro de `terminal/firmware`.

| O quê | Comando |
|---|---|
| Compilar | `pio run` |
| Gravar na placa | `pio run -t upload` |
| Ver a serial (115200) | `pio device monitor` |
| Testes no PC (Linux, macOS ou Windows com GCC) | `pio test -e native` |
| Testes no PC (Windows sem GCC) | `pio test -e native_win` |
| Ferramenta de bancada | `pio run -e bancada -t upload`, depois `pio device monitor -e bancada` |

O `native_win` usa a plataforma `windows_x86`, que baixa um MinGW próprio: não é preciso instalar nada
como administrador. O CI (`.github/workflows/terminal-ci.yml`) roda o `native` no Linux e compila os
ambientes `esp32dev` e `bancada`.

## Ferramenta de bancada (I01)

Menu na serial para testar cada peça sozinha, com os pinos do `include/pins.h`. Digite o número e Enter.

| Opção | Testa | O que observar |
|---|---|---|
| 1 | I2C | o OLED responde em `0x3C` |
| 2 e 3 | OLED com os drivers SSD1306 e SH1106 | o driver certo desenha a moldura inteira e o texto limpo |
| 4 | QR de teste no tamanho real (versão 2, 2 px por módulo) | três celulares leem? Anote modelo, app e distância |
| 5 | RC522 | o `VersionReg` e o UID da tag, em hexadecimal maiúsculo |
| 6 | GPS | sentenças `$GP...` a 9600 bps (sem fix em ambiente fechado é normal) |
| 7 | Servo em 0°, 90° e 0° | a placa não reinicia; se reiniciar, o motivo aparece no topo |
| 8 | LEDs | verde e vermelho |
| 9 | Buzzer | se é ativo (apita com nível alto) ou passivo (só com tom) |

## Estrutura

```text
platformio.ini             ambientes esp32dev, bancada, native e native_win
include/pins.h             única fonte dos números de pino (tabela 2.1 do guia)
include/secrets.example.h  modelo do secrets.h, que não é versionado
lib/core/                  lógica pura em C++11, sem Arduino.h, testada no PC
src/                       firmware: main, log e Wi-Fi
src/bancada/               ferramenta de bancada (só no ambiente bancada)
test/                      testes Unity da lib/core, um diretório por módulo
```

## Regras

- Nenhum número de pino fora do `include/pins.h`.
- A `lib/core` não inclui `Arduino.h` e recebe o tempo como parâmetro. Todo módulo dela tem teste em `test/`,
  escrito antes do código.
- A `lib/core` compila com `-Wall -Wextra -Werror`; o `src/`, com `-Wall -Wextra` e sem avisos.
- Chave e senhas nunca aparecem no log como são: use `maskSecret()`.
- O laço principal não bloqueia: nada de `delay()` longo no `loop()`.
