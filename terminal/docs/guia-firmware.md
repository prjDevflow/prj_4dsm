# Guia do firmware do Terminal de Acesso (ESP32) — etapas I01 a I15

Para: **Matheus** (firmware do terminal). Baseado no plano de IoT (I01–I15), no guia de etapas do backend (`backend/docs/ai/04` a `07`) e na montagem da protoboard ([montagem-protoboard.jpg](img/montagem-protoboard.jpg)).

Legenda: 📄 exigência do documento oficial do desafio · 💡 decisão ou sugestão do time · ★ entrega que destrava outra pessoa · ❓ pergunta em aberto (seção 11) · 🔴 essencial · 🟡 importante · 🟢 pode ser cortada se faltar tempo.

---

## 0. Como usar este guia

1. Faça as etapas na ordem da tabela da seção 1. I07 e I10 só dependem do hardware e podem ser adiantadas.
2. Para cada etapa: leia **Objetivo**, **Depende de** e **Pinos**; escreva primeiro os testes da **Lista de testes** (os que rodam no computador); depois o código; depois a verificação na bancada.
3. A etapa só fecha quando todos os **Critérios de aceitação** e a **Definição de pronto** (da etapa e a comum, seção 4) estão marcados **com evidência** (log da serial, foto, vídeo curto ou print).
4. Uma etapa = uma branch = um PR (seção 3).
5. **O contrato é lei.** Rotas, campos, status HTTP e códigos de motivo vêm de `backend/docs/ai/03-domain-and-contract.md` (seções 4.1, 4.4 e 4.5) e de `backend/openapi.yaml`. Se algo parecer faltar ou estar errado, **não invente**: anote como ❓ e fale com o Eduardo.

**O que não é deste guia:** o terminal virtual/simulador (I02). ❓ O dono dele precisa ser confirmado (pergunta 10).

---

## 1. Sequência e prazos

| ID | Etapa | Depende de | Libera | Prazo 💡 | Prioridade |
|---|---|---|---|---|---|
| I01 | Montagem e pinagem conferidas | — | I03 | 30/10 | 🔴 |
| I03 | Projeto PlatformIO, Wi-Fi e testes no PC | I01 | I04, I07, I09, I10 | 31/10 | 🔴 |
| I04 | Cliente HTTP e `/health` | I03; B01 ✅ | I05 | 01/11 | 🔴 |
| I07 | Sinais (LEDs, buzzer) e servo | I03 | I08 | 01/11 | 🔴 |
| I05 | Identidade do terminal e heartbeat | I04; B07, B11 | I06, I09, I14 | 04/11 | 🔴 |
| I06 | QR Code no display | I05; B12 | I08; Lucas (F10, F11) ★ | 06/11 | 🔴 |
| I08 | Receber a decisão e acionar | I05, I06, I07; B14 (B15 para ponta a ponta) | I11; marco M4 | 09/11 | 🔴 |
| — | **Review 2 (M3 + M4: QR gira, é lido e abre)** | | | **11/11 19h30** | |
| I09 | GPS | I03, I05; B11 | I13 | 14/11 | 🟡 |
| I10 | Leitura NFC | I03 | I11; Lucas (F13) ★ | 14/11 (adiantar se der) | 🔴 |
| I11 | Validação por NFC | I08, I10; B17 | I12 | 18/11 | 🔴 |
| I12 | Offline, fila local e reconexão | I11; B19 | I15; marco M6 | 21/11 | 🔴 |
| I14 | Segurança (HTTPS, segredos) | I05; B10 | I15 | 22/11 | 🟡 |
| I13 | Energia | I08, I09, I11 | I15 | 23/11 | 🟢 |
| I15 | Documentação, protótipo e ensaio | I12, I13, I14 | Review 3 e apresentação | 24/11 | 🔴 |
| — | **Review 3** | | | **25/11 19h30** | |

02/11 é feriado. Backend (Eduardo) em 28/10: B01–B06 prontas; B07 é a próxima; B11, B12, B14, B17 e B19 ainda não existem. Enquanto uma rota não existe, use o **modo bancada** (comandos pela serial, I07) e respostas simuladas no próprio firmware; troque pela rota real quando o Eduardo avisar (★ nos docs do backend).

**Se apertar, pode cortar:** I09 vira coordenadas fixas (`gpsSimulado: true`); I13 vira só a justificativa escrita. **Nunca cortar:** I06, I07, I08, I10, I11, I12 e os testes automatizados.

---

## 2. Hardware e pinagem (fonte da verdade: a imagem da protoboard)

![Montagem na protoboard](img/montagem-protoboard.jpg)

### 2.1 Tabela de pinos

| Módulo | Pino do módulo | Liga em | Observação |
|---|---|---|---|
| **RC522** (NFC, SPI) | SDA (SS) | GPIO 5 | GPIO 5 é pino de *boot*: não puxe para GND na partida |
| | SCK | GPIO 18 | barramento VSPI padrão |
| | MOSI | GPIO 23 | |
| | MISO | GPIO 19 | |
| | RST | GPIO 4 | |
| | IRQ | **não ligar** | leitura por consulta (polling) |
| | 3.3V / GND | trilho +3V3 / GND | ⚠️ **só 3,3 V**: 5 V queima o módulo |
| **OLED 128×64** (I2C) | SDA | GPIO 21 | 0,96" SSD1306 ou 1,3" SH1106 (❓ pergunta 1) |
| | SCL | GPIO 22 | endereço I2C normalmente `0x3C` |
| | VCC / GND | trilho +3V3 / GND | |
| **GPS NEO-6M** (UART2) | TX do GPS | GPIO 16 (RX2) | 9600 bps |
| | RX do GPS | GPIO 17 (TX2) | |
| | VCC / GND | trilho +3V3 / GND | se não fixar ou reiniciar, testar no +5V (o TX continua em 3,3 V) |
| **Servo SG90** (catraca) | laranja (sinal) | GPIO 13 | PWM 50 Hz |
| | vermelho | trilho +5V (VIN) | ⚠️ nunca no 3V3 |
| | marrom | GND | terra comum com o ESP32 |
| **LED verde** | anodo (+) | GPIO 25 → 220 Ω | catodo (−) no GND |
| **LED vermelho** | anodo (+) | GPIO 26 → 220 Ω | catodo (−) no GND |
| **Buzzer** | (+) | GPIO 27 | (−) no GND. ❓ ativo ou passivo (pergunta 8) |
| **Capacitor 470 µF** | + / faixa (−) | trilho +5V / GND | evita *reset* do ESP32 quando o servo mexe |
| **ESP32 DevKit V1** (30 pinos) | VIN | trilho +5V (5 V do USB) | |
| | 3V3 | trilho +3V3 | |
| | GND (os dois) | trilhos GND | |

Esta tabela vira o arquivo `terminal/firmware/include/pins.h` (I03). Nenhum número de pino aparece fora dele.

### 2.2 Cuidados antes de ligar o USB

- RC522 e OLED no **3,3 V**; servo no **5 V (VIN)**.
- Todos os GND ligados entre si (ESP32, servo, módulos).
- A placa pode ter outra ordem de pinos: siga o **nome serigrafado** na placa, não a posição.
- Servo alimentado pelo USB pode derrubar a tensão (*brownout*) e reiniciar o ESP32. Se acontecer mesmo com o capacitor, use fonte 5 V externa com GND comum (❓ pergunta 9).

### 2.3 O que é físico e o que pode ser simulado (📄 RP08)

📄 RF11 exige sete itens no terminal: processamento, rede, tela para o QR, sensor NFC, sinalização, GPS e mecanismo de abertura. Todos estão na protoboard. 💡 Se o GPS não fixar em ambiente fechado, as coordenadas fixas (`gpsSimulado: true`) são a simulação documentada (I09).

---

## 3. Convenções de trabalho

- **Pasta:** `terminal/firmware/` (código) e `terminal/docs/` (documentos do terminal).
- **Branch** a partir de `develop`: `feature/I05-heartbeat`, `feature/I06-exibir-qr`.
- **Commits** (Conventional Commits, em português, com o ID): `feat(I05): envia heartbeat a cada 10 s`, `test(I08): cobre comando vencido`, `fix(I07): fecha a catraca no boot`.
- **PR** para `develop`, título `[I05] Identidade e heartbeat`, corpo com os critérios de aceitação e o DoD marcados e a evidência anexada. Um revisor de outra área (Eduardo) quando a etapa usa o contrato.
- **Código:** identificadores e comentários em inglês. Textos do display em português **sem acento**. Campos JSON e códigos de motivo **exatamente** como no contrato (`usuarioId`, `TERMINAL_OFFLINE`).
- **Dependências novas** (bibliotecas), mudanças no CI ou no contrato: combinar com o Eduardo **antes**.

---

## 4. Definição de pronto comum (vale para toda etapa I)

- [ ] Os testes da lógica pura foram escritos **antes** do código e passam com `pio test -e native`.
- [ ] `pio run -e esp32dev` compila **sem avisos**, do zero, em outra máquina seguindo o README.
- [ ] Segredos (Wi-Fi, URL, id e chave do terminal) só em `include/secrets.h`, que está no `.gitignore`; `include/secrets.example.h` versionado.
- [ ] Nenhuma chave, senha ou token aparece no log da serial.
- [ ] O laço principal **não bloqueia**: tela, LEDs, buzzer, servo e leitura NFC continuam respondendo durante uma requisição de rede.
- [ ] Toda requisição tem tempo limite; falha de rede não trava o terminal.
- [ ] **Estado seguro:** a catraca fica fechada ao ligar, em erro, sem rede e após reinício.
- [ ] Comportamento conferido na bancada com evidência (log, foto ou vídeo).
- [ ] Testado contra o backend real (Docker local ou homologação) quando a rota já existe.
- [ ] Pinagem, estados e limitações atualizados em `terminal/docs/`.
- [ ] PR revisado por outra pessoa e integrado em `develop`.

---

## 5. Arquitetura do firmware

### 5.1 Ferramentas e bibliotecas 💡

| Uso | Escolha sugerida |
|---|---|
| Build e testes | PlatformIO, framework Arduino, placa `esp32dev`; ambiente `native` com Unity para testes no PC |
| Display | U8g2 (suporta SSD1306 **e** SH1106 trocando só o construtor) |
| QR | `ricmoo/QRCode` (versão fixa 2, correção L) |
| NFC | `miguelbalboa/MFRC522` |
| GPS | TinyGPSPlus |
| JSON | ArduinoJson 7 |
| Servo | ESP32Servo |
| HTTP | `HTTPClient` + `WiFiClient` / `WiFiClientSecure` (já vêm no core do ESP32) |

Fixe a versão de cada biblioteca no `platformio.ini` (`lib_deps`), para o build ser reproduzível.

### 5.2 Duas camadas: lógica pura e hardware

A regra é a mesma do backend: **a regra de negócio não conhece o hardware**, e o tempo é injetado.

```
terminal/firmware/
  platformio.ini              # ambientes esp32dev e native
  include/
    pins.h                    # tabela 2.1 (única fonte de pinos)
    secrets.example.h         # modelo versionado
    secrets.h                 # NÃO versionado
  lib/core/                   # lógica pura: C++ sem Arduino.h, testada no PC
    uid_format.*  debounce.*  backoff.*  reason_text.*  command_filter.*
    qr_layout.*   clock_sync.* gps_filter.*  event_queue.*  uuid.*
    terminal_state.*  signal_plan.*  api_parse.*
  src/                        # adaptadores de hardware e rede
    main.cpp  wifi_manager.*  api_client.*  display.*  nfc_reader.*
    gps_reader.*  signals.*  actuator.*  storage.*  bench_serial.*
  test/                       # testes Unity (ambiente native)
    test_uid_format/  test_command_filter/  ...
```

- Funções de `lib/core` recebem o tempo como parâmetro (`uint32_t nowMs`), nunca chamam `millis()`. Assim o teste "avança o relógio" sem esperar.
- Entradas de rede (JSON) são convertidas em `struct` em `api_parse` e testadas com o JSON de exemplo do contrato.

### 5.3 Tarefas (FreeRTOS) para não bloquear

| Tarefa | Núcleo | Faz | Fala com |
|---|---|---|---|
| `netTask` | 0 | Wi-Fi, heartbeat, QR, comandos, NFC, envio da fila | fila `uiQueue` (resultados) e fila `nfcQueue` (UIDs lidos) |
| `loop()` (UI) | 1 | display, LEDs, buzzer, servo, leitura NFC, GPS, serial de bancada | lê `uiQueue`, escreve `nfcQueue` |

`HTTPClient` bloqueia; por isso toda chamada HTTP fica na `netTask`. O `loop()` nunca chama a rede e nunca usa `delay()` maior que alguns milissegundos.

### 5.4 Parâmetros de tempo (do contrato)

| Parâmetro | Valor padrão | De onde vem |
|---|---|---|
| Heartbeat | a cada 10 s | contrato 4.5 (fixo) |
| Renovar o QR | `renovarEmMs` da resposta do QR (padrão `qrRefreshMs` = 10000) | heartbeat `config` / resposta do QR |
| Consulta de comandos | `commandPollMs` (1000) | heartbeat `config` |
| Abertura da catraca | `aberturaMs` do comando ou da resposta NFC; senão `config.aberturaMs` (5000) | comando / NFC / `config` |
| Vida máxima de um comando | 10 s | contrato (`COMMAND_TTL_SECONDS`) |
| Validade de um QR | `expiraEm` (emissão + 15 s) | resposta do QR |
| Debounce de tag | 3 s | contrato (`NFC_DEBOUNCE_SECONDS`) |
| Limites do backend | 1 heartbeat a cada 2 s; 1 QR a cada 5 s (senão 429) | B11, B12 |

Sem resposta do servidor, o firmware usa os padrões acima.

---

## 6. Contrato que o firmware usa (resumo)

Prefixo `/api/v1`. **Toda** requisição do terminal leva:

```
X-Terminal-Id: <uuid do terminal>
X-Terminal-Key: <chave do terminal>
Content-Type: application/json
```

Terminal de desenvolvimento (seed, público, só para dev): `X-Terminal-Id: 5eed0000-0000-4000-8000-000000000006`, `X-Terminal-Key: terminal-dev-key-1234567890abcdef1234567890` (ver `backend/docs/ambiente-dev.md`).

| Rota | Quando | Corpo enviado | Resposta | Etapa backend → firmware |
|---|---|---|---|---|
| `GET /health` | teste de conexão | — | `{ status, version, time, db }` | B01 → I04 |
| `POST /terminal/heartbeat` | a cada 10 s | `{ latitude, longitude, gpsFix, gpsSimulado, firmware, uptimeS, wifiRssi, eventosPendentes }` | `{ serverTime, config: { qrRefreshMs, commandPollMs, aberturaMs } }` | B11 → I05 |
| `POST /terminal/qr` | a cada `renovarEmMs` | — | `{ payload, emitidoEm, expiraEm, renovarEmMs }` | B12 → I06 |
| `GET /terminal/commands?after=<id>&limit=10` | a cada `commandPollMs` | — | `{ commands: [ { id, tipo, aberturaMs?, motivo?, criadoEm } ] }` | B14 → I08 |
| `POST /terminal/commands/:id/ack` | depois de executar | — | 204 | B14 → I08 |
| `POST /terminal/nfc` + `Idempotency-Key: <uuid>` | ao ler tag | `{ uid, lidoEm }` | 200: `{ resultado: "AUTORIZADO", aberturaMs }`, `{ resultado: "NEGADO", motivo }` ou `{ resultado: "CADASTRADA" }` | B17 → I11 |
| `POST /terminal/events/batch` | ao voltar a rede | `{ events: [ { clientEventId, metodo: "NFC", uid, ocorridoEm, resultado: "NEGADO", motivo: "TERMINAL_OFFLINE" } ] }` (até 50) | `{ aceitos, duplicados }` | B19 → I12 |

Formatos fixos:

- **QR:** `ACS1:<token de 22 caracteres>`, regex `^ACS1:[A-Za-z0-9_-]{22}$`. O terminal **só exibe**; quem gera é o backend 📄.
- **UID da tag:** hexadecimal, **maiúsculo**, sem separadores, 8 a 20 caracteres (`04A1B2C3D4`).
- **`id` de comando:** inteiro crescente, número no JSON (doc 03, seção 4.1; `Int` com autoincremento no banco). Comparar como `uint32_t`, nunca como texto. A sequência é global entre terminais, então os `id` de um terminal têm buracos (`41`, `47`…): é normal.
- **Datas:** ISO 8601 em UTC (`2026-10-20T14:32:07Z`).
- **Erro:** `{ "error": { "code", "message" } }`.

Como reagir aos status HTTP (todas as rotas):

| Status | Ação do firmware | Texto no display |
|---|---|---|
| 2xx | segue | — |
| 401 | para de repetir com a mesma chave; tenta de novo só a cada 60 s | `Chave invalida` |
| 403 | terminal desativado; tenta de novo a cada 60 s | `Terminal desativado` |
| 422 | erro do firmware (corpo fora do contrato): loga o `code` e **não** repete o mesmo corpo | — |
| 429 | espera `Retry-After` (ou a espera crescente) | — |
| 5xx, tempo esgotado, sem rede | espera crescente 1, 2, 4, 8… até 30 s | `Sem servidor` |

### 6.1 Textos do display (sem acento, no máximo 20 caracteres)

| Código / situação | Texto |
|---|---|
| `CREDENCIAL_INVALIDA` | `QR invalido` |
| `CREDENCIAL_EXPIRADA` | `QR expirado` |
| `CREDENCIAL_REUTILIZADA` | `QR ja usado` |
| `USUARIO_INATIVO` | `Cadastro inativo` |
| `SEM_AUTORIZACAO` | `Sem autorizacao` |
| `AUTORIZACAO_CANCELADA` | `Autoriz. cancelada` |
| `FORA_DO_PERIODO` | `Fora do horario` |
| `USOS_ESGOTADOS` | `Sem entradas` |
| `DISTANTE_DO_TERMINAL` | `Muito longe` |
| `LOCALIZACAO_INVALIDA` | `Sem localizacao` |
| `TAG_DESCONHECIDA` | `Tag desconhecida` |
| `TAG_INATIVA` | `Tag desativada` |
| `TERMINAL_OFFLINE` | `Sem conexao` |
| código não listado | `Acesso negado` |
| aprovado | `ACESSO LIBERADO` |
| negado (título) | `ACESSO NEGADO` |
| modo de cadastro | `Tag cadastrada` |
| tag lida | `Tag lida...` |
| partida | `Iniciando...` |
| sem Wi-Fi | `Sem Wi-Fi` |
| sem servidor | `Sem servidor` |
| abaixo do QR | `Leia com o app` |

A tabela vive em `lib/core/reason_text` e tem teste: **todo** texto é ASCII e tem no máximo 20 caracteres.

---

## 7. Etapas

### I01 — Montagem e pinagem conferidas (RF11, RP02, RP08)

- **Depende de:** — · **Libera:** I03
- **Prazo:** 30/10 · **Prioridade:** 🔴
- **Objetivo:** a protoboard está montada como na imagem e cada peça foi testada sozinha.

**Pinos:** tabela 2.1 inteira.

**Tarefas**

- Montar conforme a imagem; conferir 3,3 V e 5 V com multímetro **antes** de ligar os módulos.
- Rodar um *sketch* mínimo por peça (exemplo da própria biblioteca): scanner I2C acha o OLED; `DumpInfo` do MFRC522 lê uma tag; GPS imprime sentenças NMEA na serial; servo vai a 0° e 90°; LEDs e buzzer ligam.
- Anotar qual OLED é (0,96" SSD1306 ou 1,3" SH1106) e se o buzzer é ativo ou passivo.
- Escrever `terminal/docs/pinagem.md` (tabela 2.1) e `terminal/docs/lista-de-materiais.md` (peça, quantidade, preço, total).

**Critérios de aceitação**

- [ ] Os sete itens do RF11 respondem no teste individual.
- [ ] O scanner I2C mostra o endereço do OLED.
- [ ] O RC522 mostra o UID de uma tag na serial.
- [ ] O GPS imprime sentenças `$GP...` a 9600 bps.
- [ ] O servo move sem reiniciar o ESP32.
- [ ] Nenhum pino usado em dois lugares.

**Definição de pronto**

- [ ] Foto da montagem, `pinagem.md` e `lista-de-materiais.md` com preço total no PR `[I01]`.

---

### I03 — Projeto PlatformIO, Wi-Fi e testes no PC

- **Depende de:** I01 · **Libera:** I04, I07, I09, I10
- **Prazo:** 31/10 · **Prioridade:** 🔴 · **Requisitos:** RP10 (testes no pipeline)
- **Objetivo:** o projeto compila, conecta ao Wi-Fi, tem log organizado e uma suíte de testes que roda no computador.

**Tarefas**

- Criar a estrutura da seção 5.2, com `platformio.ini` de dois ambientes: `esp32dev` (placa) e `native` (testes Unity no PC).
- `include/pins.h` com a tabela 2.1.
- `include/secrets.example.h` com `WIFI_SSID`, `WIFI_PASSWORD`, `API_BASE_URL`, `TERMINAL_ID`, `TERMINAL_KEY`, `TERMINAL_LABEL` (ex.: `Terminal 01`), `GPS_FIXED_LAT`, `GPS_FIXED_LON`; `secrets.h` no `.gitignore`.
- Log na serial com níveis (`E`, `W`, `I`, `D`) e uma função que **mascara** a chave.
- `wifi_manager`: conecta, reconecta sozinho com espera crescente (máximo 30 s), mostra o IP.
- Constante `FIRMWARE_VERSION` (`"0.1.0"`, sobe a cada etapa).
- Primeiro módulo puro: `backoff` (espera crescente), com testes.
- `terminal/firmware/README.md`: instalar o PlatformIO, copiar `secrets.example.h`, compilar, gravar, rodar os testes.
- 💡 Propor ao Eduardo um job de CI `terminal` (`pio run -e esp32dev` e `pio test -e native`) no mesmo padrão do `backend-ci` (filtro de pasta + job de passagem). **Mudança no CI só com aprovação dele.**

**Lista de testes** (`pio test -e native`)

- [ ] `backoff`: deve começar em 1 s e dobrar a cada falha (1, 2, 4, 8, 16).
- [ ] `backoff`: deve parar em 30 s.
- [ ] `backoff`: deve voltar a 1 s depois de um sucesso.

**Critérios de aceitação**

- [ ] O ESP32 conecta ao Wi-Fi em menos de 15 s depois de ligado.
- [ ] Desligar e religar o roteador/hotspot faz o ESP32 reconectar sozinho.
- [ ] `secrets.h` não aparece em `git status`.
- [ ] `pio test -e native` roda e passa.
- [ ] O projeto compila do zero em outra máquina seguindo o README.

**Definição de pronto**

- [ ] Log da serial com conexão, queda e reconexão.
- [ ] Rede da demonstração definida (hotspot ou roteador; ESP32 só usa 2,4 GHz).

---

### I04 — Cliente HTTP e `/health`

- **Depende de:** I03; B01 ✅ · **Libera:** I05
- **Prazo:** 01/11 · **Prioridade:** 🔴
- **Objetivo:** o terminal fala com o backend de forma confiável, sem travar.

**Tarefas**

- `api_client` na `netTask`: URL base de `secrets.h`; tempo limite de conexão 5 s e de leitura 5 s; cabeçalhos `X-Terminal-Id` e `X-Terminal-Key` já em toda chamada (o `/health` ignora).
- Resultado tipado: `Ok`, `NetworkError`, `Timeout`, `Unauthorized` (401), `Forbidden` (403), `Unprocessable` (422), `RateLimited` (429, com `Retry-After`), `ServerError` (5xx).
- `GET /api/v1/health` a cada 5 s (só nesta etapa) e log `Servidor: OK` ou `Servidor: sem resposta`.
- Backend local: `docker compose up` no `backend/` (README) e `API_BASE_URL=http://<IP-do-PC>:3000/api/v1`.

**Lista de testes**

- [ ] `api_parse`: deve mapear 200, 204, 401, 403, 422, 429, 500 e 503 para o resultado certo.
- [ ] `api_parse`: deve ler `Retry-After` em segundos; sem o cabeçalho usa o `backoff`.
- [ ] `api_parse`: deve ler o JSON do `/health` (`status`, `db`).

**Critérios de aceitação**

- [ ] Backend ligado: o log mostra `OK` e o `db` do `/health`.
- [ ] Backend desligado: o terminal não trava, mostra o erro e volta sozinho quando o backend volta.
- [ ] Nenhuma chamada prende a `netTask` por mais de 10 s.
- [ ] O LED de teste do `loop()` continua piscando durante uma chamada lenta.

**Definição de pronto**

- [ ] Testado contra o Docker do Eduardo; log anexado ao PR.

---

### I07 — Sinais (LEDs, buzzer) e servo (RF15, RF16)

- **Depende de:** I03 (só hardware; **pode ser adiantada**) · **Libera:** I08
- **Prazo:** 01/11 · **Prioridade:** 🔴
- **Objetivo:** o terminal mostra o resultado com luz e som e move o servo que representa a catraca.

**Pinos:** LED verde GPIO 25 · LED vermelho GPIO 26 · buzzer GPIO 27 · servo GPIO 13.

**Padrões de sinal**

| Situação | LED verde | LED vermelho | Buzzer | Servo |
|---|---|---|---|---|
| Liberado | aceso 3 s | apagado | 1 bipe de 300 ms | abre (90°) por `aberturaMs`, depois fecha (0°) |
| Negado | apagado | aceso 3 s | 3 bipes de 150 ms (150 ms de pausa) | fechado |
| Tag lida | apagado | apagado | 1 bipe de 80 ms | — |
| Erro do terminal | apagado | piscando (500 ms) | — | fechado |

**Tarefas**

- `signal_plan` (puro): recebe o evento e o tempo e diz o que cada saída deve fazer agora. `signals` e `actuator` só aplicam nos pinos.
- Servo: **primeira coisa do `setup()`** é ir para 0° (fechado). Novo `ABRIR` com a catraca aberta **estende** o tempo, não empilha.
- Nada de `delay()`: tudo por tempo (`nowMs`).
- Modo bancada (`bench_serial`): comandos `open`, `deny <CODIGO>`, `read`, `error` pela serial, para testar **sem backend**.

**Lista de testes**

- [ ] `signal_plan`: liberado acende o verde por 3 s e apaga em 3 s exatos.
- [ ] `signal_plan`: negado gera 3 bipes de 150 ms com pausas de 150 ms.
- [ ] `signal_plan`: catraca abre por `aberturaMs` e fecha no instante certo.
- [ ] `signal_plan`: segundo `ABRIR` durante a abertura estende o prazo a partir do segundo comando.
- [ ] `signal_plan`: negado durante a abertura fecha a catraca? ❓ Padrão 💡: **não** interrompe uma abertura em andamento, só sinaliza.
- [ ] `signal_plan`: estado inicial é catraca fechada e tudo apagado.

**Critérios de aceitação**

- [ ] Cada linha da tabela de sinais acontece como descrito (comando pela serial).
- [ ] Durante a abertura, o display continua atualizando.
- [ ] Reiniciar o ESP32 com a catraca aberta: ela fecha.
- [ ] Dois `open` seguidos não deixam a catraca travada aberta.

**Definição de pronto**

- [ ] Vídeo curto dos quatro sinais.

---

### I05 — Identidade do terminal e heartbeat (RF11)

- **Depende de:** I04; **B07** (cadastro e chave do terminal) e **B11** (heartbeat) · **Libera:** I06, I09, I14
- **Prazo:** 04/11 · **Prioridade:** 🔴
- **Objetivo:** o terminal se identifica, aparece online no app e recebe os parâmetros de funcionamento.

**Contrato:** `POST /terminal/heartbeat` (seção 6).

**Tarefas**

- A cada 10 s enviar o heartbeat com `firmware`, `uptimeS`, `wifiRssi`, `eventosPendentes` (0 até a I12) e GPS (até a I09: `gpsFix: false`; ❓ pergunta 2 sobre `latitude`/`longitude` sem fix).
- Guardar `config` (`qrRefreshMs`, `commandPollMs`, `aberturaMs`); sem resposta, usar os padrões da seção 5.4.
- `clock_sync`: guardar `serverTime` + `millis()` da resposta; daí em diante `agoraUtc = serverTime + (millis() − millisDaResposta)`. Usado em `lidoEm`, `ocorridoEm` e na idade dos comandos.
- Status: 401 → `Chave invalida`; 403 → `Terminal desativado`; 429 → espera (seção 6).
- **Online/sem servidor:** 3 heartbeats seguidos com falha → estado `SEM_SERVIDOR`.

**Lista de testes**

- [ ] `api_parse`: deve ler `serverTime` e os três campos de `config` do exemplo do contrato.
- [ ] `api_parse`: `config` ausente ou com campo faltando usa o padrão daquele campo.
- [ ] `clock_sync`: depois de sincronizar em `2026-10-20T14:32:07Z`, 1500 ms depois formata `2026-10-20T14:32:08Z` (arredondado para baixo).
- [ ] `clock_sync`: sem sincronização informa "não sincronizado".
- [ ] `clock_sync`: `millis()` que dá a volta (`uint32_t` após ~49 dias) não quebra a conta.
- [ ] `terminal_state`: 3 falhas seguidas de heartbeat levam a `SEM_SERVIDOR`; 1 sucesso volta a `ONLINE`.
- [ ] Monta o corpo do heartbeat com exatamente os 8 campos do contrato.

**Critérios de aceitação**

- [ ] Em até 15 s depois de ligado, o terminal aparece **online** no app do administrador (F06) ou em `GET /terminals`.
- [ ] Desligado, aparece **offline** em até 30 s.
- [ ] Chave trocada no app (`rotate-key`) → o display mostra `Chave invalida`.
- [ ] Os valores de `config` recebidos são os usados pelo firmware (conferir mudando no `.env` do backend).

**Definição de pronto**

- [ ] Print do terminal online no app ou no Swagger; log com o heartbeat (**sem** a chave).

---

### I06 — QR Code no display (RF12)

- **Depende de:** I05; **B12** (emissão do QR) · **Libera:** I08; **Lucas (F10, F11) ★**
- **Prazo:** 06/11 · **Prioridade:** 🔴
- **Objetivo:** 📄 a tela mostra o QR gerado pelo backend e o troca a cada 10 s.

**Pinos:** OLED SDA 21, SCL 22. **Contrato:** `POST /terminal/qr` (seção 6). Antes da B12: pedir ao Eduardo um payload de `npm run dev:qr` ou usar um `ACS1:` falso só para testar a tela.

**Leiaute no OLED 128×64** (como na imagem)

- Esquerda: quadrado **branco** de 64×64 px; QR **versão 2** (25×25 módulos) com **2 px por módulo** = 50 px, centralizado (margem branca de 7 px ≈ 3,5 módulos). Módulos **pretos sobre fundo branco** (desenhar invertido no OLED).
- Direita (64 px): `TERMINAL_LABEL` e a contagem regressiva (`7 s`).
- Correção de erro **L** e versão **fixa 2**: 27 caracteres cabem (capacidade 32 bytes) e o tamanho nunca muda.

**Tarefas**

- `qr_layout` (puro): dado o tamanho da tela e o número de módulos, calcula o maior módulo inteiro em pixels e o deslocamento.
- Pedir o QR a cada `renovarEmMs`; nunca antes de 5 s do anterior (limite do backend).
- 📄 **Nunca mostrar QR vencido:** se `agoraUtc > expiraEm` (ou 15 s sem QR novo, se o relógio não sincronizou), sair do estado "QR ativo".
- Validar o payload com a regex do contrato antes de desenhar; payload inválido → loga e não desenha.
- Estados da tela: `Iniciando...`, `Sem Wi-Fi`, `Sem servidor`, QR ativo, `ACESSO LIBERADO`, `ACESSO NEGADO` + motivo, `Tag lida...`, `Tag cadastrada`. Sobreposição de resultado por 3 s e volta ao QR.
- Display: em U8g2, trocar o construtor entre SSD1306 e SH1106 por uma opção de compilação.

**Lista de testes**

- [ ] `qr_layout`: 25 módulos em 64 px dão 2 px por módulo e deslocamento 7.
- [ ] `qr_layout`: 33 módulos (QR maior) em 64 px dão 1 px — e o firmware recusa (QR deve ser versão 2).
- [ ] Validador de payload: aceita `ACS1:q3F8k2Zr1pLw9XbTn0YhVA`; rejeita 21 e 23 caracteres, prefixo errado e caractere fora de `[A-Za-z0-9_-]`.
- [ ] Expiração: QR com `expiraEm` no passado não é "ativo"; exatamente em `expiraEm` ainda é.
- [ ] Agenda: o próximo pedido sai em `renovarEmMs`; depois de falha, segue o `backoff` sem passar do limite de 5 s.
- [ ] `reason_text`: todos os textos da seção 6.1 são ASCII e têm no máximo 20 caracteres.

**Critérios de aceitação**

- [ ] O QR aparece em até 2 s depois de o terminal ter rede.
- [ ] O QR troca a cada 10 s (±1 s).
- [ ] O conteúdo lido por um leitor de QR bate com `^ACS1:[A-Za-z0-9_-]{22}$`.
- [ ] **3 celulares diferentes** leem o QR (anotar modelo e distância; ❓ pergunta 1).
- [ ] Sem rede, o QR sai da tela em até 25 s e aparece `Sem servidor` ou `Sem Wi-Fi`; ao voltar, o QR volta sozinho.

**Definição de pronto**

- [ ] Vídeo da troca do QR e da leitura com o app do Lucas (marco M3).

---

### I08 — Receber a decisão do backend e acionar (RF15, RF16)

- **Depende de:** I05, I06, I07; **B14** (comandos), **B15** para o ponta a ponta · **Libera:** I11; **marco M4 (Review 2)**
- **Prazo:** 09/11 · **Prioridade:** 🔴
- **Objetivo:** quando a pessoa valida pelo app, a catraca abre ou nega em poucos segundos.

**Contrato:** `GET /terminal/commands?after=<ultimoId>&limit=10` e `POST /terminal/commands/:id/ack` (seção 6).

**Tarefas**

- A cada `commandPollMs` (1 s) consultar os comandos; guardar o maior `id` visto em `after` (comparação numérica, seção 6).
- Para cada comando, em ordem crescente de `id`, **primeiro gravar o `id` na NVS** (`Preferences`) e só depois mandar a ação para a `uiQueue`:
  - `ABRIR` → sinal liberado (I07), servo abre por `aberturaMs` do comando, `ACESSO LIBERADO`.
  - `NEGAR` → sinal negado, `ACESSO NEGADO` + texto do `motivo` (seção 6.1), servo fechado.
  - `tipo` desconhecido → ignora e loga.
- Depois de executar, `POST /terminal/commands/:id/ack` (sem esperar a resposta para executar o próximo).
- 🔴 **Proteção contra comando velho ou repetido** (`command_filter`):
  1. ignorar comando com `criadoEm` mais de 10 s antes de `agoraUtc`;
  2. guardar os últimos 10 `id` executados e não executar de novo;
  3. o `id` gravado na NVS vale também depois de um reinício (item abaixo).
- 🔴 **Na partida, `after` = último `id` gravado na NVS** (vazio só se nunca houve comando). O ack só registra `executadoEm` e **não tira o comando da consulta**: com `after` vazio, todo comando com menos de 10 s volta, com ou sem ack. Como a lista dos 10 `id` fica na RAM, um reinício no meio de um `ABRIR` (por exemplo, o brownout do servo, seção 2.2) reabriria a catraca. Resposta 12 (seção 11).
- Escrever `terminal/docs/estados.md` com a máquina de estados do terminal.

**Lista de testes**

- [ ] `api_parse`: lê o exemplo do contrato (um `ABRIR` com `aberturaMs`, um `NEGAR` com `motivo`).
- [ ] `command_filter`: comando com 10 s de idade é executado; com 10,001 s não.
- [ ] `command_filter`: o mesmo `id` duas vezes executa uma vez.
- [ ] `command_filter`: guarda só os últimos 10 `id`.
- [ ] `command_filter`: relógio não sincronizado → executa só se `id` for novo (o backend já garante os 10 s) e loga aviso.
- [ ] `after` só aumenta, mesmo se a resposta vier fora de ordem.
- [ ] `after` compara como número: `9` vem antes de `10`; `id` com buracos (`41`, `47`) é aceito.
- [ ] O `id` é gravado no armazenamento (falso, injetado) **antes** de a ação ser liberada; depois de "reiniciar" (recriar o filtro a partir do armazenamento), o mesmo `ABRIR` não executa de novo e `after` começa no `id` gravado.

**Critérios de aceitação**

- [ ] Do toque no app até o servo mover: **menos de 2 s** em rede boa (medir 10 vezes; anotar o pior).
- [ ] Um `ABRIR` visto duas vezes abre uma só vez.
- [ ] Reiniciar o ESP32 (botão EN) logo depois de um `ABRIR`, ainda dentro dos 10 s: a catraca **não** abre de novo.
- [ ] Um `ABRIR` velho (criado à mão com `criadoEm` antigo, ou com o relógio atrasado de propósito) é ignorado.
- [ ] Cada motivo de negação mostra o texto certo e a catraca fica fechada.
- [ ] Backend fora do ar por 60 s: o terminal volta a consultar sozinho.

**Definição de pronto**

- [ ] Ensaio M4 com Eduardo e Lucas (cenários 1 a 7 do plano geral) na bancada; vídeo.

---

### I09 — GPS (RF11)

- **Depende de:** I03, I05; B11 · **Libera:** I13
- **Prazo:** 14/11 · **Prioridade:** 🟡 (🟢 com coordenadas fixas)
- **Objetivo:** 📄 o terminal informa a própria posição ao backend.

**Pinos:** GPS TX → GPIO 16 (RX2), GPS RX → GPIO 17 (TX2), `Serial2` a 9600 bps.

**Tarefas**

- Ler NMEA com TinyGPSPlus no `loop()` (sem bloquear): latitude, longitude, satélites, HDOP, *fix*.
- `gps_filter` (puro): posição válida só com *fix*, **4 ou mais satélites** e **HDOP até 5**; média das últimas 10 leituras válidas.
- Heartbeat: com posição válida, `gpsFix: true` e a média; sem, `gpsFix: false` (❓ pergunta 2).
- Coordenadas fixas: se `GPS_FIXED_LAT`/`GPS_FIXED_LON` estiverem definidas em `secrets.h`, enviar essas com `gpsFix: true` e **`gpsSimulado: true`** (o backend usa o cadastro como reserva, B11).
- Ícone ou letra de GPS no display (sem sinal / buscando / com sinal), se couber.
- Escrever em `terminal/docs/limitacoes.md`: GPS não fixa em ambiente fechado; a partida a frio pode levar minutos.

**Lista de testes**

- [ ] `gps_filter`: 3 satélites ou HDOP 5,1 → inválida; 4 satélites e HDOP 5,0 → válida.
- [ ] `gps_filter`: média das últimas 10 leituras; a 11ª tira a mais antiga.
- [ ] `gps_filter`: sem *fix* esvazia a média? 💡 Não: mantém as leituras, mas marca `gpsFix: false` até voltar.
- [ ] Coordenadas fixas definidas → `gpsSimulado: true`.

**Critérios de aceitação**

- [ ] Ao ar livre, obtém *fix* e a posição no app bate com o local (erro de poucos metros).
- [ ] Sem *fix*, o terminal segue funcionando e envia `gpsFix: false`.
- [ ] Com coordenadas fixas, o heartbeat marca `gpsSimulado: true`.

**Definição de pronto**

- [ ] Print da posição no app; nota sobre ambiente fechado em `limitacoes.md`.

---

### I10 — Leitura de tags NFC (RF10)

- **Depende de:** I03 (só hardware; **pode ser adiantada**) · **Libera:** I11; **Lucas (F13) ★** (UIDs para cadastrar)
- **Prazo:** 14/11 · **Prioridade:** 🔴
- **Objetivo:** o terminal detecta a tag e produz um UID no formato do contrato.

**Pinos:** RC522 SS 5, SCK 18, MOSI 23, MISO 19, RST 4, IRQ desligado, **3,3 V**.

**Tarefas**

- Consultar o leitor a cada 100 a 200 ms (não em laço apertado).
- `uid_format` (puro): bytes do UID (4, 7 ou 10) → hexadecimal **maiúsculo**, sem separadores (8, 14 ou 20 caracteres).
- `debounce` (puro): o mesmo UID é ignorado por **3 s**; UID diferente passa na hora.
- Feedback **antes** da rede: bipe de 80 ms e `Tag lida...`.
- O UID lido vai para a `nfcQueue` (a `netTask` envia na I11). Nesta etapa, só imprimir na serial: `UID: 04A1B2C3D4`.
- Testar com 3 tipos de tag (cartão, chaveiro, adesivo) e anotar a distância de leitura.

**Lista de testes**

- [ ] `uid_format`: `{0x04, 0xA1, 0xB2, 0xC3}` → `04A1B2C3`.
- [ ] `uid_format`: 7 bytes → 14 caracteres; 10 bytes → 20; zeros à esquerda preservados (`0x0A` → `0A`).
- [ ] `uid_format`: tamanho diferente de 4, 7 ou 10 bytes é rejeitado.
- [ ] `debounce`: mesmo UID em 2,999 s é ignorado; em 3 s passa.
- [ ] `debounce`: UID diferente passa imediatamente.

**Critérios de aceitação**

- [ ] A tag é lida a alguns centímetros (distância medida e anotada).
- [ ] O UID impresso é igual ao de um app de leitura NFC no celular para a mesma tag.
- [ ] Tag parada 5 s no leitor gera **uma** leitura.
- [ ] 3 tags diferentes em sequência geram 3 leituras.

**Definição de pronto**

- [ ] Tabela com os UIDs das tags da demonstração em `terminal/docs/tags-demo.md` (para o admin vincular no app).

---

### I11 — Validação por NFC no backend (RF14)

- **Depende de:** I08, I10; **B17** · **Libera:** I12
- **Prazo:** 18/11 · **Prioridade:** 🔴
- **Objetivo:** a leitura da tag vira uma decisão do backend, que o terminal executa.

**Contrato:** `POST /terminal/nfc` com `Idempotency-Key` (seção 6). Resposta **sempre 200** com a decisão. Meta 📄 até 2 s.

**Tarefas**

- `uuid` (puro + fonte aleatória injetada): UUID v4 com `esp_random()` no ESP32.
- Para cada UID lido: gerar **uma** `Idempotency-Key`, `lidoEm = agoraUtc`, enviar com tempo limite de 5 s.
- Repetição automática da **mesma leitura** (rede caiu no meio) usa a **mesma** `Idempotency-Key`.
- Interpretar a resposta:

| Resposta | Ação |
|---|---|
| `AUTORIZADO` | igual ao `ABRIR` da I08, com o `aberturaMs` da resposta |
| `NEGADO` + `motivo` | sinal negado + texto do motivo (seção 6.1) |
| `CADASTRADA` | `Tag cadastrada` + bipe de confirmação (modo de cadastro do admin) |
| tempo esgotado, sem rede, 5xx | trata como **offline** (I12), com a mesma `Idempotency-Key` como `clientEventId` do evento |
| 401 / 403 / 422 | trata como erro do terminal (seção 6); nega e loga |

- Enquanto uma sobreposição de resultado está na tela, ignorar novas leituras (ou guardar uma só).

**Lista de testes**

- [ ] `uuid`: formato `xxxxxxxx-xxxx-4xxx-[89ab]xxx-xxxxxxxxxxxx` com fonte aleatória fixa.
- [ ] `api_parse`: lê os três formatos de resposta do contrato.
- [ ] `api_parse`: `resultado` desconhecido → trata como negado e loga.
- [ ] Retentativa da mesma leitura reaproveita a mesma `Idempotency-Key`; leitura nova gera outra.
- [ ] Corpo enviado tem só `uid` e `lidoEm`, com `uid` em maiúsculas.

**Critérios de aceitação**

- [ ] Tag vinculada com autorização válida abre a catraca em **menos de 2 s**.
- [ ] Tag desconhecida, tag desativada e usuário sem autorização mostram o motivo certo e mantêm a catraca fechada.
- [ ] Uma retentativa por falha de rede **não** consome dois usos (conferir no histórico).
- [ ] O histórico do app (F12) mostra a leitura com método `NFC`.

**Definição de pronto**

- [ ] Ensaio M5 com Eduardo e Lucas (cenários 9 a 12); vídeo.

---

### I12 — Offline, fila local e reconexão (RNF03)

- **Depende de:** I11; **B19** · **Libera:** I15; **marco M6**
- **Prazo:** 21/11 · **Prioridade:** 🔴
- **Objetivo:** 📄 o terminal continua funcionando e **não perde registros** quando a rede cai.

**Política (decisão 10 do contrato):** sem rede, o terminal **nega** e registra a tentativa; ao reconectar, envia o lote. O terminal **nunca** envia `AUTORIZADO` no lote (o backend recusa com 422).

**Quando o terminal está offline:** Wi-Fi desconectado **ou** estado `SEM_SERVIDOR` (3 heartbeats falhos) **ou** a chamada do NFC falhou por rede/tempo/5xx.

**Tarefas**

- Leitura de tag offline: sinal negado, `ACESSO NEGADO` + `Sem conexao`, e o evento vai para a fila:
  `{ clientEventId: <uuid>, metodo: "NFC", uid, ocorridoEm, resultado: "NEGADO", motivo: "TERMINAL_OFFLINE" }`.
- **`clientEventId`:** se a leitura chegou a ser enviada pela I11 e falhou, é a **mesma** `Idempotency-Key`; se o terminal já estava offline, um UUID novo. A chave do NFC e o lote caem na mesma coluna única do backend (`access_events.clientEventId`): se o NFC tinha chegado, o evento do lote volta contado em `duplicados`; se não, o backend grava o `NEGADO`/`TERMINAL_OFFLINE`. Resposta 13 (seção 11).
- **Caso raro, para `terminal/docs/limitacoes.md`:** se o NFC chegou e só a resposta se perdeu, vale a decisão do backend, que pode ser `AUTORIZADO` com um uso gasto sem a catraca ter aberto. O backend não junta os dois registros nem devolve o uso.
- Sem rede, sem QR na tela (o QR depende do backend).
- `event_queue` (puro, armazenamento injetado): fila circular **persistente** (LittleFS ou NVS) com até 100 eventos; cheia → descarta o mais antigo e conta (só no log, ❓ pergunta 5).
- `eventosPendentes` no heartbeat = tamanho da fila.
- Ao voltar: `POST /terminal/events/batch` em lotes de **até 20** (o limite do backend é 50); resposta 2xx → apagar **todos** os enviados (os `duplicados` também já estão no servidor); falha de rede ou 5xx → manter e tentar com `backoff`; 422 → ❓ pergunta 4.
- **Horário do evento:** relógio sincronizado → `ocorridoEm = agoraUtc`. Nunca sincronizou desde o boot → guardar o `millis()` da leitura e preencher `ocorridoEm` na primeira sincronização (conta reversa). Se o ESP32 reiniciar antes de sincronizar, esse evento não tem hora confiável: descartar e logar (❓ pergunta 3).
- Watchdog (`esp_task_wdt`) nas duas tarefas; logar o motivo do último reinício na partida.

**Lista de testes**

- [ ] `event_queue`: inserir, ler em ordem e apagar só os enviados.
- [ ] `event_queue`: 101º evento descarta o mais antigo e conta 1 descarte.
- [ ] `event_queue`: recarregar do armazenamento falso preserva ordem e conteúdo (simula queda de energia).
- [ ] `event_queue`: lote tem no máximo 20 eventos.
- [ ] Monta o corpo do lote igual ao exemplo do contrato; `resultado` é sempre `NEGADO` e `motivo` sempre `TERMINAL_OFFLINE`.
- [ ] Evento de uma leitura que falhou online usa a `Idempotency-Key` dela como `clientEventId`; leitura feita já offline gera um UUID novo.
- [ ] `clock_sync`: evento capturado antes da sincronização recebe o horário certo quando ela chega.
- [ ] Resposta `{ aceitos: 3, duplicados: 1 }` a um lote de 4 apaga os 4.

**Critérios de aceitação** (rodar cada um e anotar)

- [ ] Wi-Fi fora por 60 s: o QR some, aparece a mensagem; ao voltar, o terminal retoma sozinho.
- [ ] Backend parado por 60 s: mesmo comportamento.
- [ ] 3 tags durante a queda: as 3 negadas com `Sem conexao` e as 3 aparecem no histórico com `TERMINAL_OFFLINE`, sem duplicar.
- [ ] Desligar da tomada com eventos na fila e religar: os eventos são enviados.
- [ ] Backend respondendo 500 por 30 s: o terminal espera e tenta de novo, sem travar.
- [ ] Backend lento (8 s): a tela não congela.

**Definição de pronto**

- [ ] Vídeo da queda e da recuperação (serve de plano B da apresentação).

---

### I14 — Segurança do terminal (RNF02)

- **Depende de:** I05; **B10** (URL de homologação com HTTPS) · **Libera:** I15
- **Prazo:** 22/11 · **Prioridade:** 🟡
- **Objetivo:** comunicação segura e segredos protegidos no dispositivo.

**Tarefas**

- HTTPS com `WiFiClientSecure` e o **certificado raiz** da homologação (o Eduardo informa na B10) em `include/root_ca.h`.
- Opção de compilação `ALLOW_INSECURE_TLS` só para desenvolvimento; `#error` se estiver ligada junto com `RELEASE_BUILD`.
- Hora certa antes do primeiro HTTPS: NTP (`configTime`) na partida; se falhar, `Sem servidor` e nova tentativa.
- Revisar: nenhuma chave em log; `secrets.h` fora do Git; nenhuma atualização remota sem senha.
- Documentar a troca da chave: `rotate-key` no app → atualizar `secrets.h` → regravar.
- Riscos aceitos em `limitacoes.md`: acesso físico ao ESP32, UID de tag clonável (decisão 12 do contrato).

**Critérios de aceitação**

- [ ] O terminal funciona por HTTPS na homologação com validação de certificado ligada.
- [ ] Com o relógio errado de propósito, o terminal sincroniza antes de conectar (ou mostra o erro).
- [ ] Nenhum segredo na serial nem no repositório.
- [ ] Build de entrega (`RELEASE_BUILD`) falha se `ALLOW_INSECURE_TLS` estiver ligado.

**Definição de pronto**

- [ ] Checklist de segurança revisado pelo Eduardo.

---

### I13 — Eficiência energética (RNF07)

- **Depende de:** I08, I09, I11 · **Libera:** I15
- **Prazo:** 23/11 · **Prioridade:** 🟢
- **Objetivo:** 📄 reduzir o consumo mantendo a operação contínua, e justificar.

**Tarefas**

- Medir a corrente de referência (medidor USB).
- Testar e medir: CPU a 160 ou 80 MHz; *modem sleep* do Wi-Fi (conferir se a latência dos comandos continua abaixo de 2 s); contraste do OLED menor; consulta NFC a 200 ms.
- 💡 Registrar por que **não** usar *deep sleep*: o terminal precisa de rede e QR o tempo todo.

**Critérios de aceitação**

- [ ] Tabela "antes e depois" com a corrente de cada configuração.
- [ ] As reduções não passam a abertura de 2 s nem atrapalham a leitura do QR.

**Definição de pronto**

- [ ] `terminal/docs/energia.md` com medições e conclusão.

---

### I15 — Documentação, protótipo e ensaio (RP02, RP07, RP08)

- **Depende de:** I12, I13, I14 · **Libera:** Review 3 e apresentação final
- **Prazo:** 24/11 · **Prioridade:** 🔴
- **Objetivo:** outra pessoa consegue montar e gravar o terminal, e a demonstração roda sem surpresas.

**Tarefas**

- `terminal/docs/`: lista de materiais com custo, imagem da montagem, pinagem, como gravar, como configurar `secrets.h`, estados e sinais, físico × simulado (RP08), limitações, solução de problemas.
- Protótipo: peças fixas numa base, cabos organizados, display de frente, leitor NFC acessível, haste no servo representando a catraca, etiquetas.
- Roteiro de demonstração (cenários M4, M5 e M6) com tempo de cada um.
- Checklist do dia: fonte e cabo reserva, hotspot testado, tags cadastradas, `/health` da homologação ok.

**Critérios de aceitação**

- [ ] Outra pessoa do time liga e grava o terminal seguindo só a documentação.
- [ ] A demonstração completa roda duas vezes seguidas sem intervenção.

**Definição de pronto**

- [ ] Documentos revisados por Eduardo e Lucas; ensaio gravado.

---

## 8. Marcos de integração em que o firmware entra

| Marco | Quando | Firmware precisa de | Roteiro |
|---|---|---|---|
| M3 O QR gira e é lido | antes de 11/11 | I06 | O QR troca a cada 10 s; o app do Lucas lê |
| **M4 Acesso por QR ponta a ponta** | **Review 2, 11/11** | I07, I08 | Cenários 1–7: liberado, QR reutilizado, cancelada, longe, fora do horário, usos esgotados, QR expirado |
| M5 Acesso por NFC | 12–18/11 | I10, I11 | Cenários 9–12: tag válida, desconhecida, desativada, autorização cancelada ou esgotada |
| M6 Resiliência | 19–25/11 | I12 | Rede fora 60 s; 3 tags negadas; voltam no histórico com `TERMINAL_OFFLINE` |
| M7 Ensaio final | antes da apresentação | tudo | M4 + M5 + M6 seguidos, no ambiente real |

---

## 9. Quem espera quem (plano de desbloqueio)

| Firmware precisa de | Etapa do backend | Enquanto não chega |
|---|---|---|
| Terminal cadastrado + chave | B07 | Usar o terminal do seed (seção 6) |
| Heartbeat | B11 | Logar o corpo montado; `config` com os padrões |
| QR | B12 (`npm run dev:qr`) | `ACS1:` falso fixo para testar a tela |
| Comandos | B14 | Modo bancada pela serial (`open`, `deny <CODIGO>`) |
| NFC | B16, B17 | Imprimir o UID na serial; resposta simulada no firmware |
| Lote offline | B19 | Fila funcionando e testada; envio liga depois |
| HTTPS | B10 | HTTP na rede local |

Peça ao Eduardo para avisar (★) quando cada rota chegar em `develop`.

---

## 10. Checklist final do firmware

- [ ] I01 e I03 a I15 concluídas; os sete itens do RF11 demonstráveis.
- [ ] QR trocando a cada 10 s; abre e nega por QR e por NFC; offline nega e envia o lote depois.
- [ ] Testes de lógica pura rodando (`pio test -e native`), de preferência no CI.
- [ ] Documentação do hardware, protótipo e vídeo de plano B prontos.

---

## 11. Perguntas em aberto ❓

Até a resposta, o firmware segue o **padrão adotado**. Nenhuma delas muda o contrato sem o Eduardo.

| # | Pergunta | Para quem | Padrão adotado |
|---|---|---|---|
| 1 | O OLED de 0,96" deixa o QR com ~9 mm de lado (≈12 mm no de 1,3"). Os celulares conseguem ler? Trocar para 1,3" SH1106 ou TFT maior? | Matheus testa; time decide | Testar com 3 celulares na I06; se falhar, propor o 1,3" (o código já suporta os dois) |
| 2 | No heartbeat sem *fix*, `latitude` e `longitude` vão `null` ou são omitidas? A B11 diz só que o backend ignora. | Eduardo (contrato) | Enviar `null` |
| 3 | O lote offline não tem campo para "relógio não confiável". O que fazer com evento lido antes de qualquer sincronização? | Eduardo (contrato) | Preencher o horário na primeira sincronização; se reiniciar antes, descartar e logar |
| 4 | O lote inteiro é recusado com 422 se um evento for inválido. O terminal descarta o lote? | Eduardo | Logar o `details`, descartar só o evento do índice apontado e reenviar o resto |
| 5 | Não há campo de "eventos descartados" no heartbeat (fila cheia). | Eduardo | Só no log da serial |
| 6 | As rotas do terminal ainda não estão no `openapi.yaml` (só na seção 4.5 do doc 03). | Eduardo | Seguir o doc 03; conferir o `openapi.yaml` a cada etapa B11, B12, B14, B17, B19 |
| 7 | Um `NEGAR` durante uma abertura em andamento interrompe a abertura? | Eduardo | Não interrompe; só sinaliza |
| 8 | O buzzer é ativo (liga/desliga) ou passivo (precisa de frequência)? | Matheus (I01) | Ativo; se for passivo, usar `ledcWriteTone` |
| 9 | O servo no 5 V do USB derruba o ESP32? | Matheus (I01, I07) | Capacitor de 470 µF; se reiniciar, fonte 5 V externa com GND comum |
| 10 | Quem cuida do terminal virtual (I02), plano B da apresentação? | Eduardo | Fora deste guia até definir |
| 14 | O `after` pode **pular** um comando? O `id` é reservado no `INSERT`, mas só fica visível no `COMMIT`: se duas validações simultâneas no mesmo terminal confirmarem fora de ordem (o 43 antes do 42) e a consulta cair entre as duas, o terminal guarda `after = 43` e nunca recebe o 42 (uso gasto, catraca fechada). Raro | Eduardo | Seguir a resposta 12 (`after` gravado na NVS). Alternativa a discutir: gravar na NVS os últimos 10 `id` executados e consultar sem `after`, já que o backend só entrega comandos com menos de 10 s |

### Respondidas

As rotas destas respostas (B14, B17, B19) ainda não existiam em 03/11: as respostas seguem o doc 03 e as etapas do backend. Conferir quando cada rota chegar em `develop`.

| # | Pergunta | Resposta (03/11) | Onde entrou |
|---|---|---|---|
| 11 | Tipo do `id` de comando | Inteiro crescente, número no JSON (`Int` com autoincremento). Comparar como `uint32_t`. Sequência global entre terminais, com buracos | Seção 6, I08 |
| 12 | Um comando já confirmado volta na consulta? | Sim: o ack só registra `executadoEm`. Com `after` vazio, todo comando com menos de 10 s volta, com ou sem ack, inclusive depois de reiniciar. Gravar o último `id` executado na NVS antes de acionar o servo e usá-lo como `after` na partida | I08 |
| 13 | O `clientEventId` do lote pode ser a `Idempotency-Key` do NFC? | Pode e deve (mesma coluna única). O backend não junta registros nem devolve uso: se o NFC tinha chegado, o lote conta em `duplicados` e vale a decisão do backend; se não, grava `NEGADO`/`TERMINAL_OFFLINE`. Caso raro anotado em `limitacoes.md` | I11, I12 |
