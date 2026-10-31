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

O middleware `authenticateTerminal` (B07) confere os dois cabeçalhos: chave errada, ausente ou id desconhecido dão
`401 UNAUTHORIZED` (a mesma mensagem nos três casos); terminal inativo com a chave certa dá `403 FORBIDDEN`. As rotas
`/terminal/*` que o usam chegam aos poucos: o heartbeat (B11) e o QR (B12) já existem; os comandos e as validações vêm
nas etapas seguintes. O administrador vê o terminal do seed em `GET /terminals` (campo `online`).

Heartbeat de teste (o terminal deve mandar a cada 10 s; menos de 2 s entre dois dá `429`):

```bash
curl -s -X POST http://localhost:3000/api/v1/terminal/heartbeat \
  -H 'X-Terminal-Id: 5eed0000-0000-4000-8000-000000000006' \
  -H 'X-Terminal-Key: terminal-dev-key-1234567890abcdef1234567890' -H 'content-type: application/json' \
  -d '{"latitude":-23.30512,"longitude":-45.96551,"gpsFix":true,"gpsSimulado":false,"firmware":"0.3.0","wifiRssi":-61}'
# {"serverTime":"2026-10-20T14:32:07Z","config":{"qrRefreshMs":10000,"commandPollMs":1000,"aberturaMs":5000}}
```

QR Code de teste, sem terminal físico (B12). O comando emite um QR para o terminal do seed e imprime só o `payload` na
saída padrão (o aviso de validade vai para a saída de erro):

```bash
npm run dev:qr
# ACS1:q3F8k2Zr1pLw9XbTn0YhVA
# QR emitido para o terminal 5eed0000-0000-4000-8000-000000000006, válido até 2026-10-20T14:32:22.000Z.
```

- O QR vale 15 s e é de uso único; use-o logo (a validação por QR chega na B15). Um pedido com menos de 5 s do anterior
  dá `QR Code pedido com muita frequência. Aguarde alguns segundos`, igual à rota.
- Para ver o QR como imagem: `npm run --silent dev:qr 2>/dev/null | qrencode -t ANSIUTF8` (precisa do `qrencode`).
- **O comando recusa rodar com `NODE_ENV=production`** (no ambiente ou no `.env`): ele emite credenciais válidas, é só
  para desenvolvimento. Ele grava no banco do `.env`, então o terminal do seed precisa existir (`npm run db:seed`).
- A mesma emissão por HTTP, com a chave de dev:

```bash
curl -s -X POST http://localhost:3000/api/v1/terminal/qr \
  -H 'X-Terminal-Id: 5eed0000-0000-4000-8000-000000000006' \
  -H 'X-Terminal-Key: terminal-dev-key-1234567890abcdef1234567890'
# {"payload":"ACS1:q3F8k2Zr1pLw9XbTn0YhVA","emitidoEm":"2026-10-20T14:32:07.000Z","expiraEm":"2026-10-20T14:32:22.000Z","renovarEmMs":10000}
```

Para o administrador cadastrar um terminal novo ou trocar a chave (a chave só aparece na resposta):

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@dev.local","senha":"Admin-Dev-2026"}' | sed 's/.*"accessToken":"\([^"]*\)".*/\1/')
curl -s http://localhost:3000/api/v1/terminals -H "Authorization: Bearer $TOKEN"
curl -s -X POST http://localhost:3000/api/v1/terminals/5eed0000-0000-4000-8000-000000000006/rotate-key \
  -H "Authorization: Bearer $TOKEN"   # a chave de dev deixa de valer: rode o seed de novo para restaurá-la
```

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
