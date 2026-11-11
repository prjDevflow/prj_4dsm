# Firmware do terminal de acesso

Firmware do ESP32 DevKit V1 da catraca: mostra o QR Code gerado pelo backend, lê tags NFC, sinaliza
com o buzzer e o display e move o servo que representa a catraca. Projeto PlatformIO com o core Arduino
2.0.17 (`platformio/espressif32@7.1.3`). As ligações de cada peça estão em [../docs/pinagem.md](../docs/pinagem.md).

Estado: ao ligar, fecha a catraca, aparece online no app (heartbeat, I05) e mostra o QR do backend trocado
a cada 10 s (I04 e I06). Validar o QR no app abre a catraca por `aberturaMs` ou mostra o motivo da negação
(I07 e I08), e encostar uma tag faz o mesmo pelo NFC (I10 e I11). A I11 usa `POST /terminal/nfc`, da B17,
que ainda está no PR #44: até ele entrar no `develop`, rode o backend do branch
`feature/B17-nfc-validation`. Faltam o GPS (I09), a fila offline (I12), energia (I13), HTTPS (I14) e o
fechamento (I15).

## Ao ligar

| Tela | Quando |
|---|---|
| `Iniciando...` | na partida, até o Wi-Fi conectar e o primeiro QR chegar |
| QR e contagem | o backend respondeu ao `POST /terminal/qr`; troca a cada `renovarEmMs` (10 s) e some quando vence |
| `Sem Wi-Fi` | a rede do `secrets.h` não conectou em 12 s; o terminal tenta de novo sozinho |
| `Sem servidor` | há Wi-Fi, mas o backend não respondeu |
| `Chave invalida` / `Terminal desativado` | o backend respondeu 401 / 403; nova tentativa a cada minuto |
| `Tag lida...` e o UID | logo ao ler uma tag (com um bipe), até a decisão do backend chegar |
| `ACESSO LIBERADO` | por 3 s, com um bipe; a catraca abre por `aberturaMs` (5 s) e fecha sozinha |
| `ACESSO NEGADO` e o motivo | por 3 s, com três bipes; a catraca não se mexe (sem rede, o motivo é `Sem conexao`) |
| `Tag cadastrada` | por 3 s, com dois bipes: o modo de cadastro do admin vinculou a tag |

Uma tag por vez: enquanto a decisão de uma tag não volta ou um resultado está na tela, o leitor não lê; a
próxima tag é lida quando a tela volta ao QR.

**Modo bancada** (só fora de um `RELEASE_BUILD`): no monitor serial, `open [ms]`, `deny <CODIGO>` (por
exemplo `deny USOS_ESGOTADOS`) e `read` simulam um `ABRIR`, um `NEGAR` e uma tag lida, sem backend.
`read <UID>` (por exemplo `read 4E7BBB06`) percorre o fluxo inteiro do NFC, até o backend.

O terminal guarda na NVS o último comando que viu, para não abrir de novo depois de um reinício. Se o banco
do backend for recriado (`docker compose down -v`), os ids recomeçam do 1 e ficam abaixo do guardado: apague
a NVS com `pio run -e esp32dev -t erase` e grave o firmware de novo.

Para o QR aparecer: rede de 2,4 GHz no `secrets.h` (no power bank, o hotspot do celular serve) e o backend
do `develop` rodando num PC da mesma rede, com o IP dele em `API_BASE_URL`. O `secrets.h` vai compilado no
firmware: depois de mudar, grave de novo.

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
| 5 | RC522 | o `VersionReg`, a antena ligada e o UID da tag, em hexadecimal maiúsculo; duas rodadas, a segunda com a antena na potência máxima |
| 6 | GPS | sentenças `$GP...` a 9600 bps (sem fix em ambiente fechado é normal); sem dados, em qual fio chega sinal |
| 7 | Servo em 0°, 90° e 0° | a placa não reinicia; se reiniciar, o motivo aparece no topo |
| 8 | Buzzer | fase 1 (três bipes com nível alto) e fase 2 (um tom longo): três bipes é ativo; só o tom longo, passivo |
| 9 | Servo indo e voltando por 30 s | aperte os jumpers e meça o VIN enquanto roda: se mexer ao apertar um fio, o mau contato é nele |

## Estrutura

```text
platformio.ini             ambientes esp32dev, bancada, native e native_win
include/pins.h             única fonte dos números de pino (mapa em ../docs/pinagem.md)
include/secrets.example.h  modelo do secrets.h, que não é versionado
lib/core/                  lógica pura em C++11, sem Arduino.h, testada no PC
src/                       firmware: main, log, Wi-Fi, rede (net_task, api_client), tela, NFC, buzzer e catraca
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
