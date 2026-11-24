# Eventos de acesso: campo × quando é nulo

Para o Pedro (F12) saber o que esperar de cada evento. Um evento é o registro imutável de **uma tentativa de acesso**, aprovada ou negada. A tabela é `access_events`; as consultas (`GET /access-events`, `GET /me/access-events`) são da B18 e a seção "O que o histórico devolve", no fim, diz o que cada coluna vira na resposta. Os nomes abaixo são os das colunas.

Vale para todas as tentativas:

- Cada tentativa gera **exatamente um** evento. Não existe rota para editar ou apagar um evento.
- Um evento **nunca** guarda token do QR, chave do terminal, senha ou o hash inteiro de uma credencial.
- Instantes em UTC (ISO 8601). Mostre no fuso do usuário (`America/Sao_Paulo`).

## Campos

| Campo | Tipo | Quando é nulo |
|---|---|---|
| `id` | UUID | Nunca. |
| `ocorridoEm` | instante UTC | Nunca. É o instante do servidor, exceto nos eventos de um lote offline (`TERMINAL_OFFLINE`): neles é o do relógio do terminal, de até 7 dias antes do envio. |
| `metodo` | `QR` ou `NFC` | Nunca. |
| `resultado` | `AUTORIZADO` ou `NEGADO` | Nunca. |
| `motivo` | código da seção 4.4 do contrato | Nulo quando `AUTORIZADO`. Sempre preenchido quando `NEGADO`. |
| `usuarioId` | UUID | QR: nunca, porque o app sempre está logado (vale também para conta inativa e para QR desconhecido). NFC: nulo só em `TAG_DESCONHECIDA`. Lote offline: nulo quando o UID não é de nenhuma tag (a tag desativada identifica a pessoa do mesmo jeito). |
| `terminalId` | UUID | QR: nulo quando o QR não existe (`CREDENCIAL_INVALIDA` por hash desconhecido); preenchido nos demais casos. NFC: nunca, o terminal se autentica. |
| `accessPointId` | UUID | Igual ao `terminalId`: o ponto vem do terminal. |
| `authorizationId` | UUID | Preenchido quando `AUTORIZADO` e nas negações que já escolheram a autorização: `DISTANTE_DO_TERMINAL` e `LOCALIZACAO_INVALIDA`. Nulo em todas as outras: credencial (inclusive `CREDENCIAL_REUTILIZADA` e `USOS_ESGOTADOS` que vêm de uma corrida), `USUARIO_INATIVO`, `SEM_AUTORIZACAO`, `AUTORIZACAO_CANCELADA`, `FORA_DO_PERIODO` e `USOS_ESGOTADOS`, as negações de tag e os eventos de um lote offline. Um mesmo motivo grava sempre os mesmos campos. |
| `distanciaM` | número, em metros | Só existe no QR. Preenchido quando `AUTORIZADO` e em `DISTANTE_DO_TERMINAL`, com o valor exato (a resposta da validação o arredonda ao metro). Nulo no NFC e em todas as outras negações, inclusive `LOCALIZACAO_INVALIDA` (sem posição não há distância). |
| `detalhes` | objeto ou nulo | Nulo quando não há nada a guardar. Chaves possíveis abaixo. |

As linhas de `authorizationId` e `distanciaM` são as que a B15 grava e que os testes de integração de `POST /access/qr/validate` confirmam.

## Chaves de `detalhes`

| Chave | Quando aparece |
|---|---|
| `precisaoMetros` | QR, quando o celular informou a precisão do GPS. |
| `credencialHashPrefixo` | QR com credencial desconhecida. São só os 8 primeiros caracteres do hash, o bastante para correlacionar tentativas e insuficiente para localizar a credencial. |
| `uid` | NFC, em toda tentativa (aprovada ou negada, inclusive `TAG_DESCONHECIDA`) e em cada evento de um lote offline. É o UID **inteiro** e já normalizado (maiúsculas, sem separadores). Fica inteiro porque a repetição rápida da mesma tag (`NFC_DEBOUNCE_SECONDS`) só pode comparar o UID exato: um trecho dele poderia casar duas tags diferentes. O UID já é visível a quem administra as tags (`GET /nfc-tags`). |

No NFC, `clientEventId` é a `Idempotency-Key` da leitura (UUID em minúsculas) e nunca é nulo; no QR é nulo. Num lote offline é a `clientEventId` que o terminal escolheu (também em minúsculas): repetir a chave não grava outro evento, e a mesma chave não pode ser usada por uma leitura ao vivo. O NFC não mede distância (`distanciaM` nulo) e uma negação não grava `authorizationId`. Leituras no modo de cadastro (`CADASTRADA`) e repetições dentro da janela do debounce não geram evento.

## Motivos (`motivo`)

`CREDENCIAL_INVALIDA`, `CREDENCIAL_EXPIRADA`, `CREDENCIAL_REUTILIZADA`, `USUARIO_INATIVO`, `SEM_AUTORIZACAO`, `AUTORIZACAO_CANCELADA`, `FORA_DO_PERIODO`, `USOS_ESGOTADOS`, `DISTANTE_DO_TERMINAL`, `LOCALIZACAO_INVALIDA`, `TAG_DESCONHECIDA`, `TAG_INATIVA` e `TERMINAL_OFFLINE`. Os textos para o usuário estão na seção 4.4 do contrato. `TERMINAL_OFFLINE` só aparece em eventos que o terminal envia depois de ficar sem conexão (B19, `POST /terminal/events/batch`). Esses eventos são sempre `NFC` e `NEGADO`, sem autorização e sem distância, e nunca consomem uso.

## O que o histórico devolve (B18)

`GET /access-events` (admin) e `GET /me/access-events` (os do token) devolvem a lista paginada, do mais recente para o mais antigo. Cada item tem **só** estes campos (o formato completo está no `openapi.yaml`, schema `EventoDeAcesso`):

| Campo da resposta | Vem de | Quando é `null` |
|---|---|---|
| `id`, `ocorridoEm`, `metodo`, `resultado`, `motivo`, `distanciaM`, `authorizationId` | a coluna de mesmo nome | como na tabela acima |
| `usuario` (`id`, `nome`, `perfil`) | `usuarioId`, já resolvido | quando `usuarioId` é nulo: NFC com `TAG_DESCONHECIDA` |
| `local` (`id`, `nome`, `tipo`, `edificio` com `id` e `nome`) | `accessPointId`, já resolvido | quando `accessPointId` é nulo: QR com credencial inexistente |
| `terminal` (`id`, `nome`) | `terminalId`, já resolvido | quando `terminalId` é nulo: QR com credencial inexistente |

Ficam **fora** da resposta: `detalhes` (UID da tag, prefixo do hash, precisão do GPS) e `clientEventId` (a `Idempotency-Key`). Para o app, uma tag desconhecida aparece com `motivo: "TAG_DESCONHECIDA"` e `usuario: null`; o UID só se vê na serial do terminal.

Os eventos de um lote offline entram na ordem do `ocorridoEm` que o terminal informou, não na do envio, e os filtros `de` e `ate` também olham esse instante. Para o app, são negações como as outras, com o texto de `TERMINAL_OFFLINE`.

Os filtros são `usuarioId`, `accessPointId`, `terminalId`, `metodo`, `resultado`, `motivo`, `de` e `ate` (instantes, os dois inclusivos). Em `/me/access-events` o `usuarioId` não existe: o dono é o do token.
