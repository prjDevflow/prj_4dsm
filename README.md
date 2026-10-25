# Controle de Acesso — ABP 2026-2

[![Backend CI](https://github.com/prjDevflow/prj_4dsm/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/prjDevflow/prj_4dsm/actions/workflows/ci.yml)

Sistema integrado de controle de acesso para edifícios e condomínios, formado por três partes:

- **Terminal de acesso** (ESP32 ou simulador) instalado na catraca: mostra um QR Code que muda a cada 10 s, lê tags NFC e abre ou nega a passagem.
- **App mobile** para administradores, condôminos e visitantes: o administrador cadastra usuários, locais e autorizações; o usuário lê o QR da catraca para entrar e consulta as próprias autorizações e o histórico.
- **API** que gera os QR Codes, valida cada tentativa (autorização, período, horário, usos e distância de até 100 m), manda o terminal abrir ou negar e registra um evento por tentativa.

```text
┌──────────────┐   HTTPS + JWT    ┌──────────────┐   HTTP (polling)   ┌──────────────────┐
│  App mobile  │ ───────────────▶ │     API      │ ◀───────────────── │ Terminal (ESP32) │
│ React Native │                  │   Express    │   chave do terminal│   ou simulador   │
└──────────────┘                  └──────┬───────┘                    └──────────────────┘
                                         │
                                  ┌──────▼───────┐
                                  │  PostgreSQL  │
                                  └──────────────┘
```

## Situação atual

| Parte          | Pasta       | Situação                                                                                                  |
| -------------- | ----------- | --------------------------------------------------------------------------------------------------------- |
| Backend        | `backend/`  | Setup, Docker, Prisma, CI e modelo de dados com seed prontos (B01 a B04). Autenticação (B05) em andamento |
| App mobile     | `mobile/`   | Setup do app em andamento (F01): Expo, testes com Jest e MSW, cliente HTTP e servidor mock                |
| Terminal       | `terminal/` | Ainda não iniciado                                                                                        |
| Infraestrutura | `infra/`    | Ainda não iniciada (banco em nuvem e deploy chegam na B10)                                                |

O andamento etapa por etapa fica em [backend/docs/ai/STATUS.md](backend/docs/ai/STATUS.md) e [mobile/docs/ai/STATUS.md](mobile/docs/ai/STATUS.md).

## Tecnologias

| Parte   | Stack                                                                                          |
| ------- | ---------------------------------------------------------------------------------------------- |
| Backend | Node.js, Express 5, TypeScript (`strict`), Prisma 7, PostgreSQL 17, Zod, Pino, Vitest          |
| Mobile  | React Native, Expo SDK 57, Expo Router, TypeScript (`strict`), Zod, Jest, Testing Library, MSW |
| DevOps  | Docker e Docker Compose, GitHub Actions                                                        |

## Estrutura do repositório

```text
backend/    API, banco de dados (Prisma), Docker e testes
mobile/     app React Native (Expo) e servidor mock da API
terminal/   firmware do ESP32 e simulador do terminal
infra/      infraestrutura de nuvem e deploy
docs/       documentação geral do projeto
.github/    workflows de CI e regras de proteção de branch
```

## Como rodar

### Pré-requisitos

- **Docker** (Docker Desktop ou Docker Engine + Compose v2), para a API e o banco.
- **Node.js 22.18 ou superior** e npm 10+, para o app mobile e para desenvolver o backend.
- **Expo Go** no celular Android, para abrir o app.

### Backend (API + banco)

Só com Docker, sem precisar de Node:

```bash
cd backend
cp .env.example .env              # troque POSTGRES_PASSWORD (e DB_PORT, se a 5432 estiver ocupada)
docker compose up --build -d      # sobe a API e o PostgreSQL
docker compose run --rm migrate   # cria as tabelas
docker compose run --rm seed      # dados de desenvolvimento
curl http://localhost:3000/api/v1/health
# {"status":"ok","version":"0.1.0","time":"...","db":"up"}
```

Os usuários e o terminal criados pelo seed estão em [backend/docs/ambiente-dev.md](backend/docs/ambiente-dev.md). Para desenvolver sem Docker, rodar os testes e ver todos os comandos, consulte o [README do backend](backend/README.md).

### App mobile

```bash
cd mobile
npm ci
```

Crie o arquivo `mobile/.env` com a URL da API (sempre terminando em `/api/v1`):

```bash
# servidor mock do próprio app
EXPO_PUBLIC_API_URL=http://<IP-do-computador>:4010/api/v1
# ou a API real
# EXPO_PUBLIC_API_URL=http://<IP-do-computador>:3000/api/v1
```

No celular, `localhost` aponta para o próprio aparelho; use o IP do computador na rede local.

```bash
npm run mock    # servidor mock da API na porta 4010 (em outro terminal)
npm start       # inicia o Expo; leia o QR Code com o Expo Go
```

## Testes e qualidade

| Onde      | Comando                                                                                                     |
| --------- | ----------------------------------------------------------------------------------------------------------- |
| `backend` | `npm test` (unitários), `npm run test:int` (integração com PostgreSQL), `npm run lint`, `npm run typecheck` |
| `mobile`  | `npm test`, `npm run test:mock`, `npm run lint`, `npm run typecheck`, `npm run format:check`                |

O projeto segue TDD: todo código de produção nasce de um teste que falhou antes. O CI do backend ([.github/workflows/ci.yml](.github/workflows/ci.yml)) roda lint, typecheck, build e os testes em todo push e pull request, e o check `backend-ci` é obrigatório para o merge em `develop` e `main`.

## Fluxo de trabalho

- `main` recebe as versões estáveis; `develop` integra o trabalho em andamento.
- Cada etapa tem um ID (`B05` no backend, `F03` no mobile) e ganha sua própria branch, a partir de `develop`: `feature/B05-authentication`.
- Commits no padrão [Conventional Commits](https://www.conventionalcommits.org/) com o ID da etapa: `feat(B05): adiciona login com JWT`.
- Pull request para `develop` com o título `[B05] ...`, CI verde e uma aprovação de outro integrante.
- O contrato da API ([backend/docs/ai/03-domain-and-contract.md](backend/docs/ai/03-domain-and-contract.md) e [backend/openapi.yaml](backend/openapi.yaml)) é compartilhado pelas três partes e só muda com acordo de todos.

## Equipe

| Integrante | Responsável por |
| ---------- | --------------- |
| Eduardo    | Backend         |
| Lucas      | App mobile      |
| Pedro      | Terminal (IoT)  |
| Rafael     | Design do app   |

## Documentação

- [README do backend](backend/README.md): instalação, Docker, banco, testes e CI.
- [Modelo de dados](backend/docs/modelo-de-dados.md): diagrama ER das tabelas.
- [Domínio e contrato da API](backend/docs/ai/03-domain-and-contract.md): requisitos, regras de negócio, rotas e códigos.
- [Etapas do app mobile](mobile/docs/ai/etapas-frontend.md): telas, textos e critérios de cada etapa.
- [Design do app mobile](docs/app-mobile/design/README.md): telas no Figma, decisões de design e tokens.
- [AGENTS.md do backend](backend/AGENTS.md) e [do mobile](mobile/AGENTS.md): regras para quem trabalha com assistentes de IA.
