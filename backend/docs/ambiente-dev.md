# Ambiente de desenvolvimento

> **Atenção: tudo aqui é público e só vale para desenvolvimento.** Estas credenciais estão no
> repositório (`backend/.env.example`). Nunca use este seed em homologação ou produção: o seed se
> recusa a rodar com `NODE_ENV=production`, e lá as senhas e a chave do terminal devem ser outras,
> guardadas como segredos.

Os valores abaixo são os padrões do `.env.example`. Se alguém trocar uma variável `SEED_*` no próprio
`.env`, o valor dessa pessoa vale no banco dela.

## Subir tudo (só com Docker)

```bash
cd backend
cp .env.example .env              # ajuste POSTGRES_PASSWORD (e DB_PORT, se a 5432 estiver ocupada)
                                  # e defina JWT_SECRET com 32+ caracteres: openssl rand -base64 48
docker compose up --build -d      # API + PostgreSQL
docker compose run --rm migrate   # tabelas
docker compose run --rm seed      # dados de desenvolvimento (pode repetir quantas vezes quiser)
curl http://localhost:3000/api/v1/health
```

O `migrate` e o `seed` reconstroem a imagem a cada execução (rápido, usa cache). Para silenciar o log do
build, acrescente `--quiet-build`. Sem Docker (Node 22.18+): `npm run db:seed`.

## Usuários

Entram pelo `POST /auth/login` (B05), no Swagger em <http://localhost:3000/docs> ou com `curl` (exemplo no README).

| Perfil    | E-mail                | Senha              | Id                                     |
| --------- | --------------------- | ------------------ | -------------------------------------- |
| ADMIN     | `admin@dev.local`     | `Admin-Dev-2026`   | `5eed0000-0000-4000-8000-000000000001` |
| CONDOMINO | `condomino@dev.local` | `Usuario-Dev-2026` | `5eed0000-0000-4000-8000-000000000002` |
| VISITANTE | `visitante@dev.local` | `Usuario-Dev-2026` | `5eed0000-0000-4000-8000-000000000003` |

O e-mail do administrador vem de `SEED_ADMIN_EMAIL` e a senha de `SEED_ADMIN_PASSWORD`; a senha dos
outros dois, de `SEED_USER_PASSWORD`. No banco fica só o hash bcrypt.

## Terminal de desenvolvimento

Para o simulador e para o ESP32 de bancada (autenticação por cabeçalho, a partir da B07):

| Cabeçalho       | Valor                                         |
| --------------- | --------------------------------------------- |
| `X-Terminal-Id` | `5eed0000-0000-4000-8000-000000000006`        |
| `X-Terminal-Key` | `terminal-dev-key-1234567890abcdef1234567890` |

A chave vem de `SEED_TERMINAL_KEY`; o banco guarda só o SHA-256 dela, então ela não pode ser recuperada
do banco.

## Local e autorização de teste

| Item           | Valor                                                                                           |
| -------------- | ----------------------------------------------------------------------------------------------- |
| Edifício       | "Edifício de Testes" (`5eed0000-0000-4000-8000-000000000004`)                                   |
| Ponto de acesso | Catraca `CAT-01` (`5eed0000-0000-4000-8000-000000000005`)                                      |
| Coordenadas    | `-23.30512, -45.96551` (exemplo do doc 03; troque por `SEED_LATITUDE` e `SEED_LONGITUDE`)        |
| Autorização    | do visitante nesta catraca, 00:00 a 23:59, 100 usos, de hoje até 365 dias depois (`5eed0000-0000-4000-8000-000000000007`) |

**As coordenadas são provisórias.** Troque-as pelas da catraca real do local de testes, no `.env`, e
rode o seed de novo: ele atualiza o edifício e a catraca.

## O que o seed faz ao rodar de novo

É idempotente (todos os registros têm id fixo):

- não duplica nada;
- renova só a data final da autorização do visitante, para ela continuar vigente;
- **não** zera os usos já gastos e **não** reativa uma autorização cancelada;
- só reescreve o hash da senha de um usuário se a senha do `.env` mudou;
- não reativa um usuário que foi desativado.

Para recomeçar do zero: `docker compose down -v`, e repita os comandos acima. O banco de testes (`access_test`)
volta vazio; para rodar `npm run test:int`, migre-o com `MIGRATE_DB=access_test docker compose run --rm migrate`. (`npm run db:reset` faz o
equivalente sem Docker e semeia em seguida; o Prisma pede confirmação.)

## Ver o banco

No pgAdmin: host `localhost`, porta `DB_PORT` do `.env`, banco `access`, usuário `access` e a senha de
`POSTGRES_PASSWORD`. O diagrama do modelo está em [modelo-de-dados.md](modelo-de-dados.md).

## Homologação

A URL de homologação (B10) será publicada aqui. Ela **não** usa estas credenciais.
