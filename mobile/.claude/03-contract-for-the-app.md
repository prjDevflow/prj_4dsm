# 03 — O contrato da API visto pelo app

Carregue este arquivo ao mexer em qualquer serviço, tipo do contrato, mensagem de erro ou tela de resultado. **A fonte da verdade continua sendo** `backend/docs/ai/03-domain-and-contract.md` e `backend/openapi.yaml`; este arquivo é o resumo para o app. Se discordarem, vale o do backend, e a diferença vira ❓.

Legenda: 📄 exigência do documento oficial do desafio · 💡 decisão ou sugestão do time (pode mudar) · ★ entrega que destrava outra pessoa · ❓ pergunta em aberto (lista no [STATUS.md](STATUS.md)) · 🔴 essencial · 🟡 importante · 🟢 pode ser cortada se faltar tempo.

---

## 1. Contrato da API: o mínimo que você precisa saber

Fonte da verdade: `backend/docs/ai/03-domain-and-contract.md` (seções 4 e 6) e `backend/openapi.yaml`. Swagger com a API rodando: <http://localhost:3000/docs>.

| Tema | Regra |
|---|---|
| Prefixo | `/api/v1` (a `EXPO_PUBLIC_API_URL` já termina nele) |
| Autenticação | `Authorization: Bearer <accessToken>`; o token vale 12 h e **não há refresh token** |
| Paginação | `?page=1&pageSize=20` (máximo 100) → `{ data: [], page, pageSize, total }` |
| Erro | `{ "error": { "code": "CODIGO", "message": "Texto", "details": [{ "field": "email", "message": "..." }] } }`; `details` só em 422 |
| Status | 200/201 ok · 401 sem login ou token inválido · 403 sem permissão **ou acesso negado** · 404 · 409 conflito · 422 validação · 429 limite · 500 |
| Campos | Em português e exatamente como no contrato: `senha`, `perfil`, `usuarioId`, `situacaoEfetiva`, `usosRestantes` |

**Rotas que o app usa:**

| Rota | Etapa do app | Etapa do backend | Situação em 28/10 |
|---|---|---|---|
| `GET /health` | F01 | B01 | ✅ pronta |
| `POST /auth/login`, `GET /auth/me` | F03, F04 | B05 | ✅ pronta |
| `POST/GET/PATCH /users`, `GET /users/:id` | F05, F07, F13 | B06 | ✅ pronta |
| `/buildings`, `/access-points`, `/terminals`, `POST /terminals/:id/rotate-key` | F06, F07 | B07 | ⬜ próxima do Eduardo |
| `POST /authorizations`, `GET /authorizations/:id` | F07, F08, F09 | B08 | ⬜ |
| `GET /authorizations`, `PATCH /authorizations/:id/cancel`, `GET /me/authorizations` | F08, F09 | B09 | ⬜ |
| `POST /access/qr/validate` | F11 | B15 | ⬜ (o núcleo do sistema) |
| `POST/GET/PATCH /nfc-tags`, `POST /terminals/:id/enroll-mode` | F13 | B16 | ⬜ |
| `GET /access-events`, `GET /me/access-events` | F12 | B18 | ⬜ |

Enquanto uma rota não existe, você usa **serviços falsos** (`01-architecture.md`, seção 6) com os formatos que o Eduardo já escreveu nos guias do backend (`05-steps-B06-B10.md`, `06-steps-B11-B15.md`, `07-steps-B16-B20.md`). Quando ele avisar que a rota saiu (★), você troca o falso pelo real mudando uma variável de ambiente. Nenhuma tela muda.

## 2. Códigos de negação (o coração da tela de resultado)

Quando o acesso é negado, `POST /access/qr/validate` responde **403** com `error.code` igual a um destes motivos. O texto na tela é o `message` do contrato, palavra por palavra. **O código nunca aparece na tela.** O tom (âmbar ou vermelho) e o botão vêm do `tokens.md` do Rafael:

| Código | Texto na tela | Tom | Ícone | Botão principal |
|---|---|---|---|---|
| `CREDENCIAL_INVALIDA` | Este QR Code não é válido. Aponte para o QR Code da catraca. | Âmbar | `qr_code_2` | Ler outro QR Code |
| `CREDENCIAL_EXPIRADA` | Este QR Code expirou. Leia o novo QR Code que aparece na tela. | Âmbar | `timer_off` | Ler outro QR Code |
| `CREDENCIAL_REUTILIZADA` | Este QR Code já foi usado. Aguarde o próximo e leia de novo. | Âmbar | `restart_alt` | Ler outro QR Code |
| `DISTANTE_DO_TERMINAL` | Você está longe da catraca. Aproxime-se e tente de novo. | Âmbar | `wrong_location` | Tentar de novo |
| `LOCALIZACAO_INVALIDA` | Não conseguimos confirmar sua localização. Ative o GPS e tente de novo. | Âmbar | `location_off` | Tentar de novo |
| `SEM_AUTORIZACAO` | Você não tem autorização para este local. | Vermelho | `block` | Ver minhas autorizações |
| `AUTORIZACAO_CANCELADA` | Sua autorização foi cancelada. Procure a administração. | Vermelho | `cancel` | Ver minhas autorizações |
| `FORA_DO_PERIODO` | Sua autorização não vale para esta data ou horário. | Vermelho | `event_busy` | Ver minhas autorizações |
| `USOS_ESGOTADOS` | Você já usou todas as entradas desta autorização. | Vermelho | `remove_circle` | Ver minhas autorizações |
| `USUARIO_INATIVO` | Seu cadastro está inativo. Procure a administração. | Vermelho | `person_off` | Ver minhas autorizações |

Botão secundário: sempre "Voltar ao início". Âmbar = a própria pessoa resolve; vermelho = depende da administração ou de outra data. Os três últimos códigos do contrato (`TAG_DESCONHECIDA`, `TAG_INATIVA`, `TERMINAL_OFFLINE`) **só aparecem no histórico** (F12), porque vêm do NFC e do terminal.

**Erros que não são negação** (também na tela de resultado, com "Ler outro QR Code"): sem internet ou tempo esgotado → "Sem conexão. Verifique sua internet e leia o QR Code de novo."; 5xx → "Não foi possível validar agora. Tente de novo em instantes."; 401 → sessão expirada (volta ao login).

Atenção: 403 também é "perfil sem permissão" (`FORBIDDEN`). Na validação do QR, decida pelo `error.code`, nunca só pelo status.
