# Plano de testes e relatório de execução

Como o backend é testado, o que cada camada de teste prova, onde está cada caso obrigatório do contrato e o resultado da última execução completa.

## 1. Estratégia

O backend nasce de testes escritos antes do código (vermelho, verde, refatorar), um commit pequeno por passo. Os nomes dos testes descrevem comportamento, em português ("deve negar quando a autorização está cancelada").

| Camada | O que cobre | Dependências | Onde |
|---|---|---|---|
| **Unitária** | casos de uso e regras puras, cada ramo e cada limite (a ponta exata e um minuto fora) | doubles em memória e `FakeClock`; sem banco | `src/**/*.spec.ts` |
| **Integração** | rota, middlewares, caso de uso, Prisma e PostgreSQL reais: status e corpo, permissões (401 e 403), persistência, migrações, transações e **concorrência** | PostgreSQL de testes (`access_test`) | `test/integration/*.test.ts` |
| **Manual** | o que depende de aparelhos ou de ambiente publicado: terminal, câmera, GPS, deploy, alerta de queda | dispositivos e ambiente reais | seção 6 |

Princípios:

- **Concorrência e atomicidade só se provam com o banco real.** Uma unidade com doubles não prova que dois pedidos simultâneos aprovam um só. Os testes de corrida estão na integração (seção 5).
- **Tempo é injetado.** Prazo de QR, janela de autorização e validade de comando usam `FakeClock`; a integração usa o relógio do sistema e insere a linha já vencida em vez de esperar.
- **Preferir fakes a mocks.** Os repositórios em memória guardam a semântica que o caso de uso usa (unicidade, filtros, tudo-ou-nada), e sobrevivem a refatorações.
- **Teste que passa de primeira não prova nada.** Quando isso acontece (por exemplo, o helmet já estava ligado), o código é quebrado de propósito uma vez (mutação) para ver o teste falhar. As mutações de cada etapa estão registradas no `docs/ai/STATUS.md` e em [seguranca.md](seguranca.md).
- **Nunca enfraquecer um teste para ficar verde.**

## 2. Como rodar

Pré-requisito da integração: PostgreSQL de pé com as migrações aplicadas no banco de testes (veja o [README](../README.md): `docker compose up -d db` e `MIGRATE_DB=access_test docker compose run --rm migrate`).

```bash
npm test             # unitários (rápido, sem banco)
npm run test:watch   # unitários em modo watch (ciclo TDD)
npm run test:cov     # unitários com cobertura (mínimo 80% de linhas e 75% de ramos)
npm run test:int     # integração (leva alguns minutos)
npm run typecheck && npm run lint && npm run build
```

O CI ([ci.yml](../../.github/workflows/ci.yml)) roda a mesma sequência a cada push e PR: lint, tipos, build, migração do banco de teste, unitários com cobertura (relatório publicado como artefato `backend-coverage`) e integração, com o PostgreSQL 17 como serviço do job. O job **Segurança** roda à parte (`npm audit` e varredura de segredos).

## 3. Casos obrigatórios do contrato

Os casos da seção 9 de [docs/ai/03-domain-and-contract.md](ai/03-domain-and-contract.md), e onde está a prova de cada um.

### 3.1 Validação por QR (15 casos)

Unidade: [ValidateQrAccess_UseCase.spec.ts](../src/useCases/Access/ValidateQrAccess/ValidateQrAccess_UseCase.spec.ts). Integração: [accessQrValidate.test.ts](../test/integration/accessQrValidate.test.ts). Os dez motivos de negação têm um caso cada nas duas camadas (`it.each` sobre a tabela do contrato).

| # | Cenário | Esperado | Camadas |
|---|---|---|---|
| 1 | Autorização válida, QR vigente, perto | autorizado, um uso consumido, um evento, comando `ABRIR` | U e I |
| 2 | QR adulterado | `CREDENCIAL_INVALIDA` | U e I |
| 3 | QR expirado (15 s) | `CREDENCIAL_EXPIRADA` | U e I |
| 4 | QR já usado | `CREDENCIAL_REUTILIZADA` | U e I |
| 5 | Autorização de outro local | `SEM_AUTORIZACAO` | U e I |
| 6 | Autorização cancelada | `AUTORIZACAO_CANCELADA` | U e I |
| 7 e 8 | Fora do período ou fora do horário (pontas exatas passam, um minuto fora não) | `FORA_DO_PERIODO` | U e I |
| 9 | Usos esgotados | `USOS_ESGOTADOS` | U e I |
| 10 | Distância: 99 m passa, 101 m não, e o valor exato do limite passa | `DISTANTE_DO_TERMINAL` | U e I |
| 11 | Coordenadas ausentes (negação) ou fora da faixa (422, sem evento) | `LOCALIZACAO_INVALIDA` ou 422 | U e I |
| 12 | Usuário inativo | `USUARIO_INATIVO` | U e I |
| 13 | Duas (e oito) leituras simultâneas do mesmo QR | só uma aprovada | I |
| 14 | Sem token, token inválido ou expirado, conta apagada | 401, sem evento | I |
| 15 | Qualquer caso acima | exatamente um evento (e, no `500`, nenhum uso consumido) | U e I |

Também: dois QRs diferentes com um uso restante aprovam só um; o limite de 10 validações por minuto por usuário (`429`); a medição da distância a partir do GPS do heartbeat ou do cadastro; o terminal recebe `ABRIR` ou `NEGAR` na consulta de comandos.

### 3.2 NFC (6 casos)

Unidade: [ValidateNfcAccess_UseCase.spec.ts](../src/useCases/Nfc/ValidateNfcAccess/ValidateNfcAccess_UseCase.spec.ts). Integração: [terminalNfc.test.ts](../test/integration/terminalNfc.test.ts).

| # | Cenário | Esperado |
|---|---|---|
| 1 | Tag vinculada, autorização válida | `AUTORIZADO` com `aberturaMs`, um uso, um evento `NFC` |
| 2 | Tag desconhecida | `NEGADO` `TAG_DESCONHECIDA` + evento |
| 3 | Tag desativada (inclusive depois de um `PATCH`) | `NEGADO` `TAG_INATIVA` + evento |
| 4 | Autorização cancelada, expirada, esgotada ou de outro local; usuário inativo | `NEGADO` com o motivo certo (os sete motivos do NFC) |
| 5 | Leituras repetidas em sequência rápida (menos de 3 s, no mesmo terminal) | mesma decisão, um só uso e um só evento; a partir de 3 s é nova tentativa |
| 6 | Mesma `Idempotency-Key` repetida | decisão anterior, sem novo consumo (também com oito leituras simultâneas) |

### 3.3 Administração e resiliência

| Caso | Onde |
|---|---|
| Só `ADMIN` cria, cancela e consulta autorizações (403 para os demais) | `authorizations.test.ts`, `authorizationsList.test.ts`, `authorizationsManagement.test.ts` |
| Cada filtro devolve o conjunto certo; usuário só vê as próprias | `authorizationsList.test.ts`, `accessEventsList.test.ts` |
| Cancelamento imediato e visível na validação seguinte | `authorizationsManagement.test.ts`, `accessQrValidate.test.ts` |
| Lote offline duplicado grava cada evento uma vez; `AUTORIZADO` no lote é rejeitado | `terminalEventsBatch.test.ts`, `IngestOfflineEvents_UseCase.spec.ts` |
| Histórico: filtros, isolamento, 10 mil eventos em menos de 300 ms, nenhuma rota que altere ou apague | `accessEvents*.test.ts` |
| Criar autorização contra desativações simultâneas; desativar locais e dois `PATCH` simultâneos no mesmo ponto | `authorizationConcurrency.test.ts`, `locationConcurrency.test.ts` |

## 4. Etapa B20

| Critério | Prova |
|---|---|
| `GET /ready`: 200 com o banco no ar, 503 com ele fora, sem vazar o erro | `GetReadiness_UseCase.spec.ts` (3), `ready.test.ts` (4, inclusive a sonda do Prisma contra uma porta fechada) |
| Cabeçalhos do `helmet`, HSTS só em produção, CORS por lista | `securityHeaders.test.ts` (8) |
| Limites de requisição: terminal, falhas de autenticação, rotas públicas, `TRUST_PROXY` | `rateLimits.test.ts` (8) e os specs de cada limitador |
| Validação de entrada em todas as rotas e `openapi.yaml` completo | `routeInventory.test.ts` (36) |
| Logs sem segredo; `500` sem stack em produção | `requestLog.test.ts`, `errors.test.ts` |
| Variáveis novas no `parseEnv` e no compose | `parseEnv.spec.ts`, `dockerComposeEnv.spec.ts` |
| Chave antiga do terminal deixa de valer na troca | `terminals.test.ts` |

## 5. Concorrência e idempotência

Todos contra o PostgreSQL real, porque só ele decide quem ganha a corrida:

| Situação | Resultado esperado | Arquivo |
|---|---|---|
| Duas e oito leituras do mesmo QR | uma aprovada, as outras `CREDENCIAL_REUTILIZADA`, um uso, um evento por tentativa | `accessQrValidate.test.ts` |
| Dois QRs diferentes, um uso restante | um aprovado, o outro `USOS_ESGOTADOS` | `accessQrValidate.test.ts` |
| Oito tags do mesmo usuário, três usos | três `AUTORIZADO`, cinco `USOS_ESGOTADOS` | `terminalNfc.test.ts` |
| Oito leituras NFC com a mesma `Idempotency-Key` | todas a mesma decisão, um uso, um evento | `terminalNfc.test.ts` |
| Quatro envios simultâneos do mesmo lote offline | cada evento gravado uma vez | `terminalEventsBatch.test.ts` |
| Dois envios simultâneos com as mesmas chaves em ordens opostas (deadlock); vinte gravações diretas | sem erro, cada evento uma vez | `accessEventRepository.test.ts` |
| Oito pedidos simultâneos de QR do mesmo terminal; vinte chamadas diretas ao repositório | um emitido, os outros `429` | `terminalQr.test.ts`, `qrCredentialRepository.test.ts` |
| Oito heartbeats simultâneos | só um aceito, os outros `429` | `terminalHeartbeat.test.ts` |
| Oito cadastros simultâneos do mesmo UID de tag | um `201`, sete `409`, uma só linha | `nfcTags.test.ts` |
| Oito chamadas simultâneas para gastar o modo de cadastro | só uma gasta | `terminalRepository.test.ts` |

## 6. Testes manuais

| # | Verificação | Situação |
|---|---|---|
| M1 | Parar o banco do compose: `/ready` dá 503 e `/health` mostra `db: down`; a API continua de pé e volta a 200 sozinha | ✅ feita em 2026-11-08 ([seguranca.md](seguranca.md#7-monitoramento)) |
| M2 | Alerta de queda visível em até 5 minutos | ⬜ depende da B10 (URL pública) e de um monitor externo |
| M3 | Backup e restauração do banco no compose | ✅ feita em 2026-11-08 ([backup-e-restauracao.md](backup-e-restauracao.md)) |
| M4 | Uma pessoa de fora sobe e testa o sistema só com o README | ⬜ precisa de outra pessoa |
| M5 | Resposta do NFC em até 2 s no ambiente de homologação | ⬜ depende da B10 (local: menos de 2 s) |
| M6 | Teste com o terminal físico (QR, NFC, lote offline) | ⬜ com o Matheus |
| M7 | `docker compose up` do zero e demonstração pelo Swagger | ⬜ a ser repetido na revisão do PR |

## 7. Relatório de execução

Última execução completa: **2026-11-08**, branch `feature/B20-security-monitoring-docs`, código no commit `4a0dee0` (depois dele só mudou documentação).

Ambiente: Linux, Node.js v22.22.2 (o CI usa o 24), PostgreSQL 17 (`postgres:17-alpine` do compose).

| Verificação | Resultado |
|---|---|
| `npm run typecheck` | ✅ sem erros (código e testes) |
| `npm run lint` | ✅ sem avisos (inclui a fronteira de camadas) |
| `npm run build` | ✅ |
| `npm test` | ✅ **845 testes** em 77 arquivos |
| `npm run test:cov` | ✅ 99,54% das instruções · 98,44% dos ramos · 100% das funções · 100% das linhas (mínimo exigido: 80% das linhas e 75% dos ramos) |
| `npm run test:int` | ✅ **804 testes** em 43 arquivos (6 min 17 s) |
| `npm audit --omit=dev --audit-level=high` | ✅ 0 vulnerabilidades em produção |
| gitleaks (histórico completo) | ✅ nenhum achado com o `.gitleaks.toml` (31 falsos positivos revisados) |

Evolução da etapa: 811 unitários e 744 de integração ao começar a B20 (herdados da B19); +34 unitários e +60 de integração.

Testes que passaram de primeira na B20 e foram provados por mutação: o corpo e o log do `/ready`, a sonda do banco, o helmet, o HSTS e o CORS, os limitadores (fiação e unidades), o inventário e a validação das rotas, a ocultação de segredos nos logs, o `500` em produção e a troca da chave do terminal. Nenhuma mutação sobreviveu.

## 8. O que não foi executado

- M2, M4, M5, M6 e M7 da seção 6.
- O job **Segurança** do CI rodou localmente com os mesmos comandos; a primeira execução no GitHub acontece no PR.
- Teste de carga: os limites de requisição foram escolhidos pelo uso normal do terminal (seção 2 de [seguranca.md](seguranca.md)), não medidos sob carga.
