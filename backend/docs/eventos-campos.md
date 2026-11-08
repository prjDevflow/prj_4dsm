# Eventos de acesso: campo × quando é nulo

Para o Pedro (F12) saber o que esperar de cada evento. Um evento é o registro imutável de **uma tentativa de acesso**, aprovada ou negada. A tabela é `access_events`; as consultas (`GET /access-events`, `GET /me/access-events`) chegam na B18, e o formato exato das respostas será definido lá. Os nomes abaixo são os das colunas.

Vale para todas as tentativas:

- Cada tentativa gera **exatamente um** evento. Não existe rota para editar ou apagar um evento.
- Um evento **nunca** guarda token do QR, chave do terminal, senha ou o hash inteiro de uma credencial.
- Instantes em UTC (ISO 8601). Mostre no fuso do usuário (`America/Sao_Paulo`).

## Campos

| Campo | Tipo | Quando é nulo |
|---|---|---|
| `id` | UUID | Nunca. |
| `ocorridoEm` | instante UTC | Nunca. |
| `metodo` | `QR` ou `NFC` | Nunca. |
| `resultado` | `AUTORIZADO` ou `NEGADO` | Nunca. |
| `motivo` | código da seção 4.4 do contrato | Nulo quando `AUTORIZADO`. Sempre preenchido quando `NEGADO`. |
| `usuarioId` | UUID | QR: nunca, porque o app sempre está logado (vale também para conta inativa e para QR desconhecido). NFC: nulo só em `TAG_DESCONHECIDA`. |
| `terminalId` | UUID | QR: nulo quando o QR não existe (`CREDENCIAL_INVALIDA` por hash desconhecido); preenchido nos demais casos. NFC: nunca, o terminal se autentica. |
| `accessPointId` | UUID | Igual ao `terminalId`: o ponto vem do terminal. |
| `authorizationId` | UUID | Preenchido quando `AUTORIZADO` e nas negações que já escolheram a autorização: `DISTANTE_DO_TERMINAL` e `LOCALIZACAO_INVALIDA`. Nulo em todas as outras: credencial (inclusive `CREDENCIAL_REUTILIZADA` e `USOS_ESGOTADOS` que vêm de uma corrida), `USUARIO_INATIVO`, `SEM_AUTORIZACAO`, `AUTORIZACAO_CANCELADA`, `FORA_DO_PERIODO` e `USOS_ESGOTADOS`, e as negações de tag. Um mesmo motivo grava sempre os mesmos campos. |
| `distanciaM` | número, em metros | Só existe no QR. Preenchido quando `AUTORIZADO` e em `DISTANTE_DO_TERMINAL`, com o valor exato (a resposta da validação o arredonda ao metro). Nulo no NFC e em todas as outras negações, inclusive `LOCALIZACAO_INVALIDA` (sem posição não há distância). |
| `detalhes` | objeto ou nulo | Nulo quando não há nada a guardar. Chaves possíveis abaixo. |

As linhas de `authorizationId` e `distanciaM` são as que a B15 grava e que os testes de integração de `POST /access/qr/validate` confirmam.

## Chaves de `detalhes`

| Chave | Quando aparece |
|---|---|
| `precisaoMetros` | QR, quando o celular informou a precisão do GPS. |
| `credencialHashPrefixo` | QR com credencial desconhecida. São só os 8 primeiros caracteres do hash, o bastante para correlacionar tentativas e insuficiente para localizar a credencial. |
| `uid` | NFC, em toda tentativa (aprovada ou negada, inclusive `TAG_DESCONHECIDA`). É o UID **inteiro** e já normalizado (maiúsculas, sem separadores). Fica inteiro porque a repetição rápida da mesma tag (`NFC_DEBOUNCE_SECONDS`) só pode comparar o UID exato: um trecho dele poderia casar duas tags diferentes. O UID já é visível a quem administra as tags (`GET /nfc-tags`). |

No NFC, `clientEventId` é a `Idempotency-Key` da leitura (UUID em minúsculas) e nunca é nulo; no QR é nulo. O NFC não mede distância (`distanciaM` nulo) e uma negação não grava `authorizationId`. Leituras no modo de cadastro (`CADASTRADA`) e repetições dentro da janela do debounce não geram evento.

## Motivos (`motivo`)

`CREDENCIAL_INVALIDA`, `CREDENCIAL_EXPIRADA`, `CREDENCIAL_REUTILIZADA`, `USUARIO_INATIVO`, `SEM_AUTORIZACAO`, `AUTORIZACAO_CANCELADA`, `FORA_DO_PERIODO`, `USOS_ESGOTADOS`, `DISTANTE_DO_TERMINAL`, `LOCALIZACAO_INVALIDA`, `TAG_DESCONHECIDA`, `TAG_INATIVA` e `TERMINAL_OFFLINE`. Os textos para o usuário estão na seção 4.4 do contrato. `TERMINAL_OFFLINE` só aparece em eventos que o terminal envia depois de ficar sem conexão (B19).
