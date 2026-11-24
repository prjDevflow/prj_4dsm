# Diagramas de sequência

Os dois fluxos de acesso do backend: **QR Code** (o app lê o QR do terminal) e **NFC** (o terminal lê a tag). Os dois usam o mesmo avaliador de autorização (`AccessEvaluator`) e gravam **exatamente um evento por tentativa**.

Contrato das rotas: [openapi.yaml](../openapi.yaml) (Swagger em `/docs`). Ordem das verificações e efeitos de uma decisão: [docs/ai/03-domain-and-contract.md](ai/03-domain-and-contract.md), seções 5.1 a 5.3.

## 1. Acesso por QR Code

O terminal pede um QR novo a cada `QR_REFRESH_MS` (10 s) e o desenha na tela. A pessoa lê o QR com o app, que envia o texto lido e a posição do celular. O backend decide, grava o evento e cria um comando para a catraca.

```mermaid
sequenceDiagram
    autonumber
    participant T as Terminal (ESP32)
    participant API as API
    participant DB as PostgreSQL
    actor P as Pessoa
    participant App as App

    loop a cada QR_REFRESH_MS
        T->>API: POST /terminal/qr (X-Terminal-Id, X-Terminal-Key)
        API->>DB: grava o SHA-256 do token (expira em 15 s)
        API-->>T: 200 payload ACS1:..., expiraEm, renovarEmMs
        T->>T: desenha o QR Code na tela
    end

    P->>App: lê o QR Code
    App->>API: POST /access/qr/validate (Bearer JWT, payload, latitude, longitude)
    API->>DB: busca a credencial pelo hash, o usuário e as autorizações
    API->>API: 11 verificações em ordem (a primeira que falhar define o motivo)

    alt todas passam
        API->>DB: transação única: consome a credencial, consome um uso, grava o evento AUTORIZADO, cria o comando ABRIR
        API-->>App: 200 AUTORIZADO (usosRestantes, distanciaM)
    else alguma falha
        API->>DB: grava o evento NEGADO com o motivo e cria o comando NEGAR (o QR não é consumido)
        API-->>App: 403 com error.code igual ao motivo
    end

    loop a cada COMMAND_POLL_MS
        T->>API: GET /terminal/commands
        API-->>T: comandos pendentes (ABRIR com aberturaMs, ou NEGAR com motivo)
    end
    T->>T: abre ou nega a catraca
    T->>API: POST /terminal/commands/{id}/ack
    API-->>T: 204
```

Pontos que o diagrama resume:

- **Atomicidade.** Na aprovação, se qualquer passo da transação falhar (inclusive o evento), nada é consumido e a resposta é `500`. Duas leituras simultâneas do mesmo QR aprovam só uma; a outra recebe `CREDENCIAL_REUTILIZADA` ou `USOS_ESGOTADOS`.
- **Negação não consome o QR.** Quem errou (por exemplo, estava longe) pode tentar de novo enquanto o QR vale.
- **Comando com prazo.** O comando só é entregue enquanto tiver até `COMMAND_TTL_SECONDS` (10 s) de vida. Depois disso, nunca mais.
- **Tempo.** O relógio do servidor decide o prazo do QR e a janela de cada autorização (fuso `America/Sao_Paulo`, limites inclusivos).

## 2. Acesso por NFC

A decisão vem **na própria resposta** do terminal (sempre `200`); não há comando nem app. Cada leitura traz um `Idempotency-Key` novo (UUID).

```mermaid
sequenceDiagram
    autonumber
    participant T as Terminal (ESP32)
    participant API as API
    participant DB as PostgreSQL

    T->>API: POST /terminal/nfc (chave do terminal, Idempotency-Key, uid)
    API->>DB: já existe evento com esta Idempotency-Key?

    alt chave já vista
        API-->>T: 200 a decisão anterior (sem novo uso, sem novo evento)
    else terminal em modo de cadastro vigente
        API->>DB: vincula a tag ao usuário combinado
        API-->>T: 200 CADASTRADA (sem uso e sem evento de acesso)
    else mesma tag, mesmo terminal, em menos de NFC_DEBOUNCE_SECONDS
        API-->>T: 200 a decisão anterior
    else leitura nova
        API->>DB: tag existe? tag ativa? usuário ativo?
        API->>API: AccessEvaluator (autorização, período, usos), sem distância
        alt aprovada
            API->>DB: transação única: grava o evento AUTORIZADO (com a Idempotency-Key) e consome um uso
            API-->>T: 200 AUTORIZADO (aberturaMs)
        else negada
            API->>DB: grava o evento NEGADO com o motivo
            API-->>T: 200 NEGADO (motivo)
        end
    end
    T->>T: abre ou nega a catraca pela resposta
```

Pontos que o diagrama resume:

- **Idempotência.** Repetir a mesma `Idempotency-Key` (por exemplo, o terminal não recebeu a resposta e reenviou) devolve a decisão anterior. Quem decide a corrida entre dois envios simultâneos é o índice único de `clientEventId`.
- **Ordem do evento.** Na aprovação o evento é gravado antes do consumo do uso, dentro da mesma transação. Assim a repetição que corre contra o original nunca vira um falso `USOS_ESGOTADOS`.
- **Falha ao gravar.** Numa aprovação, falhar ao gravar o evento dá `500` e nenhum uso é consumido. Numa negação, a falha vai para o log e o terminal recebe `NEGADO` mesmo assim.

## 3. Eventos guardados sem conexão

Sem rede, o terminal **nega** as leituras e as guarda. Ao reconectar, envia o lote.

```mermaid
sequenceDiagram
    autonumber
    participant T as Terminal (ESP32)
    participant API as API
    participant DB as PostgreSQL

    Note over T: sem rede: nega a leitura e guarda o evento (clientEventId, uid, ocorridoEm)
    T->>API: POST /terminal/events/batch (até 50 eventos, até 64 kb)
    API->>API: valida o lote inteiro (só NFC, NEGADO e TERMINAL_OFFLINE, com data de 7 dias atrás a 5 min à frente)

    alt algum evento inválido
        API-->>T: 422 com o índice no details (nada é gravado)
    else lote válido
        API->>DB: identifica a tag de cada UID e grava os eventos novos (ignora as clientEventId já recebidas)
        API-->>T: 200 aceitos, duplicados
    end
    Note over T: só apaga os eventos guardados depois do 200 (um 500 significa que nada foi confirmado)
```

- Nenhum uso é consumido e nenhum comando é criado: offline o terminal só nega.
- Reenviar o mesmo lote é seguro; os já recebidos entram em `duplicados`.
