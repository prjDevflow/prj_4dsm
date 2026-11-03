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
| `authorizationId` | UUID | Preenchido quando `AUTORIZADO`. Nulo nas negações que acontecem antes de olhar as autorizações (credencial, usuário inativo, `SEM_AUTORIZACAO`, tag). Nas demais negações de autorização, a regra de qual autorização gravar fecha na B15. |
| `distanciaM` | número, em metros | Só existe no QR. Nulo no NFC e nas negações que acontecem antes de medir a distância. Preenchido quando `AUTORIZADO` e em `DISTANTE_DO_TERMINAL`. |
| `detalhes` | objeto ou nulo | Nulo quando não há nada a guardar. Chaves possíveis abaixo. |

As linhas de `authorizationId` e `distanciaM` descrevem o que a B15 vai gravar; a B13 entrega a estrutura e a B15 as confirma com testes de integração.

## Chaves de `detalhes`

| Chave | Quando aparece |
|---|---|
| `precisaoMetros` | QR, quando o celular informou a precisão do GPS. |
| `credencialHashPrefixo` | QR com credencial desconhecida. São só os 8 primeiros caracteres do hash, o bastante para correlacionar tentativas e insuficiente para localizar a credencial. |

O UID parcial da tag NFC entra na B17.

## Motivos (`motivo`)

`CREDENCIAL_INVALIDA`, `CREDENCIAL_EXPIRADA`, `CREDENCIAL_REUTILIZADA`, `USUARIO_INATIVO`, `SEM_AUTORIZACAO`, `AUTORIZACAO_CANCELADA`, `FORA_DO_PERIODO`, `USOS_ESGOTADOS`, `DISTANTE_DO_TERMINAL`, `LOCALIZACAO_INVALIDA`, `TAG_DESCONHECIDA`, `TAG_INATIVA` e `TERMINAL_OFFLINE`. Os textos para o usuário estão na seção 4.4 do contrato. `TERMINAL_OFFLINE` só aparece em eventos que o terminal envia depois de ficar sem conexão (B19).
