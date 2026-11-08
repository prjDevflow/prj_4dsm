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
`/terminal/*` que o usam são o heartbeat (B11), o QR (B12) e os comandos (B14). A validação de acesso (B15) é do app e usa
o token do usuário. O administrador vê o terminal do seed em `GET /terminals` (campo `online`).

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

- O QR vale 15 s e é de uso único; use-o logo (veja a validação por QR mais abaixo). Um pedido com menos de 5 s do anterior
  dá `QR Code pedido com muita frequência. Aguarde alguns segundos`, igual à rota.
- Para ver o QR como imagem: `npm run --silent dev:qr 2>/dev/null | qrencode -t ANSIUTF8` (precisa do `qrencode`).
- **O comando recusa rodar com `NODE_ENV=production`** (no ambiente ou no `.env`): ele emite credenciais válidas, é só
  para desenvolvimento. Ele grava no banco do `.env`, então o terminal do seed precisa existir (`npm run db:seed`). Com a `DATABASE_URL` do `.env` apontando para o banco em nuvem (Neon), o QR é gravado lá: confira a URL antes de rodar. O comando também não confere se o terminal está ativo, ao contrário da rota.
- A mesma emissão por HTTP, com a chave de dev:

```bash
curl -s -X POST http://localhost:3000/api/v1/terminal/qr \
  -H 'X-Terminal-Id: 5eed0000-0000-4000-8000-000000000006' \
  -H 'X-Terminal-Key: terminal-dev-key-1234567890abcdef1234567890'
# {"payload":"ACS1:q3F8k2Zr1pLw9XbTn0YhVA","emitidoEm":"2026-10-20T14:32:07.000Z","expiraEm":"2026-10-20T14:32:22.000Z","renovarEmMs":10000}
```

Comandos para o terminal (B14). O terminal consulta a cada 1 s (`commandPollMs`) e confirma o que executou:

```bash
H=(-H 'X-Terminal-Id: 5eed0000-0000-4000-8000-000000000006' \
   -H 'X-Terminal-Key: terminal-dev-key-1234567890abcdef1234567890')
curl -s "${H[@]}" 'http://localhost:3000/api/v1/terminal/commands?after=0&limit=10'
# {"commands":[{"id":42,"tipo":"ABRIR","aberturaMs":5000,"criadoEm":"2026-10-20T14:32:07.123Z"},
#              {"id":43,"tipo":"NEGAR","motivo":"DISTANTE_DO_TERMINAL","criadoEm":"2026-10-20T14:32:08.456Z"}]}
curl -s -o /dev/null -w '%{http_code}\n' -X POST "${H[@]}" http://localhost:3000/api/v1/terminal/commands/42/ack
# 204
```

- Na próxima consulta use `after=<maior id que o terminal já viu>`: assim ele não recebe o mesmo comando duas vezes.
- **Um comando vale 10 s** (`COMMAND_TTL_SECONDS`) depois de criado; passado isso ele nunca é entregue, para um `ABRIR`
  não abrir a catraca minutos depois. A lista vazia (`{"commands":[]}`) é a resposta normal quando não há nada novo.
- O `ack` de um comando de outro terminal, ou de um id que não existe, dá `404`; repetir o `ack` dá `204` de novo.
- Quem cria os comandos é a validação de acesso (B15, abaixo): `ABRIR` quando aprova e `NEGAR` com o motivo quando
  nega. Para testar só o terminal, sem passar por ela, ainda dá para inserir um na mão (vale 10 s; rode e consulte
  logo em seguida):

```bash
docker compose exec db psql -U access -d access -c "INSERT INTO terminal_commands (\"terminalId\", tipo, \"aberturaMs\", \"criadoEm\", \"expiraEm\") VALUES ('5eed0000-0000-4000-8000-000000000006', 'ABRIR', 5000, now(), now() + interval '10 seconds')"
```

- Os comandos vencidos há mais de 1 hora (`COMMAND_PURGE_AFTER_HOURS`) são apagados por um job a cada minuto, que sobe com
  o servidor (`npm run dev`, `npm start`).

Validação de acesso por QR (B15). É o que o app faz depois de ler o QR Code: `POST /access/qr/validate`, com o token
do usuário. O visitante do seed tem uma autorização de 100 usos nesta catraca (00:00 a 23:59), então o fluxo todo roda
com os dados do seed e do `dev:qr`:

```bash
B=http://localhost:3000/api/v1
TOKEN=$(curl -s -X POST $B/auth/login -H 'content-type: application/json' \
  -d '{"email":"visitante@dev.local","senha":"Usuario-Dev-2026"}' | sed 's/.*"accessToken":"\([^"]*\)".*/\1/')
QR=$(npm run --silent dev:qr 2>/dev/null)      # o QR vale 15 s: valide logo

curl -s -X POST $B/access/qr/validate -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d "{\"payload\":\"$QR\",\"latitude\":-23.30512,\"longitude\":-45.96551,\"precisaoMetros\":12.5}"
# 200 {"resultado":"AUTORIZADO","mensagem":"Acesso autorizado. Pode passar.","local":{"nome":"Catraca de Testes"},
#      "usosRestantes":99,"distanciaM":0,"ocorridoEm":"2026-10-20T14:32:07Z"}

# o mesmo QR de novo, ou um QR com o celular a mais de 100 m, dá 403 com o motivo e o texto para mostrar:
# 403 {"error":{"code":"CREDENCIAL_REUTILIZADA","message":"Este QR Code já foi usado. Aguarde o próximo e leia de novo."}}
```

- **Cada tentativa vira um evento** (`access_events`) e, quando o QR identifica o terminal, um comando para ele: `ABRIR` na
  aprovação, `NEGAR` com o motivo na negação. O terminal os vê em `GET /terminal/commands` (acima) em até 1 s e tem
  10 s para executá-los.
- A aprovação consome a credencial e **um** uso; a negação não consome nada, então o mesmo QR pode ser tentado de novo
  dentro dos 15 s (por exemplo, depois de chegar mais perto). O visitante do seed perde um uso a cada aprovação e o seed
  não os devolve (`npm run db:reset` recomeça do zero).
- Os motivos de negação e os textos estão na seção 4.4 do contrato e, um exemplo de cada, no Swagger (`/docs`).
- Coordenadas **ausentes** dão `LOCALIZACAO_INVALIDA` (403); coordenadas **fora da faixa**, ou um `payload` que não é
  `ACS1:` mais 22 caracteres, dão 422 e não geram evento. Sem token é 401, também sem evento.
- A posição do terminal para medir a distância é o GPS dele, se o último heartbeat tem fix e menos de 10 min; senão,
  as coordenadas do ponto de acesso (`TERMINAL_POSITION_SOURCE=GPS_COM_FALLBACK`). Para testar com o ponto fixo, mande
  um heartbeat com `gpsFix: false` ou use `TERMINAL_POSITION_SOURCE=CADASTRO`.
- Mais de 10 validações por minuto do mesmo usuário dão `429` (`QR_VALIDATE_MAX_PER_MINUTE`).

Para o administrador cadastrar um terminal novo ou trocar a chave (a chave só aparece na resposta):

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@dev.local","senha":"Admin-Dev-2026"}' | sed 's/.*"accessToken":"\([^"]*\)".*/\1/')
curl -s http://localhost:3000/api/v1/terminals -H "Authorization: Bearer $TOKEN"
curl -s -X POST http://localhost:3000/api/v1/terminals/5eed0000-0000-4000-8000-000000000006/rotate-key \
  -H "Authorization: Bearer $TOKEN"   # a chave de dev deixa de valer: rode o seed de novo para restaurá-la
```

## Tags NFC (B16)

O administrador vincula uma tag a um usuário. O visitante do seed (`5eed0000-0000-4000-8000-000000000003`) serve
para o teste. Para o ESP32 de bancada (I10), o UID lido aparece na serial; é esse texto que se digita aqui:

```bash
B=http://localhost:3000/api/v1
TOKEN=$(curl -s -X POST $B/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@dev.local","senha":"Admin-Dev-2026"}' | sed 's/.*"accessToken":"\([^"]*\)".*/\1/')

# vincula a tag (o UID pode vir com ":" ou "-" e em minúsculas: vira 04A1B2C3)
curl -s -X POST $B/nfc-tags -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"usuarioId":"5eed0000-0000-4000-8000-000000000003","uid":"04:a1:b2:c3","descricao":"Cartão azul"}'
# 201 {"id":"...","usuarioId":"5eed0000-0000-4000-8000-000000000003","uid":"04A1B2C3","descricao":"Cartão azul","ativa":true,"criadaEm":"..."}
# o mesmo UID de novo, escrito de qualquer jeito, dá 409:
# 409 {"error":{"code":"TAG_JA_CADASTRADA","message":"Esta tag já está cadastrada"}}

curl -s "$B/nfc-tags?usuarioId=5eed0000-0000-4000-8000-000000000003&ativa=true" -H "Authorization: Bearer $TOKEN"

# desativa (a próxima leitura dá NEGADO TAG_INATIVA); {"ativa":true} reativa
curl -s -X PATCH $B/nfc-tags/<id> -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"ativa":false}'
```

Modo de cadastro (I11): em vez de digitar o UID, o administrador liga o modo no terminal e encosta a tag nele. Ligar o
modo só grava o usuário e o prazo; quem vincula a tag é a primeira leitura (`POST /terminal/nfc`, próxima seção).

```bash
curl -s -X POST $B/terminals/5eed0000-0000-4000-8000-000000000006/enroll-mode \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"usuarioId":"5eed0000-0000-4000-8000-000000000003"}'
# 200 {"terminalId":"5eed0000-0000-4000-8000-000000000006","usuarioId":"5eed0000-0000-4000-8000-000000000003","expiraEm":"2026-11-07T14:33:07.000Z"}
```

- O modo dura `ENROLL_MODE_SECONDS` (60 s) e acaba sozinho; ligar de novo antes disso troca o usuário e renova o prazo.
  `GET /terminals` não mostra o modo.
- UID que não é hexadecimal de 8 a 20 caracteres dá `422` no campo `uid`; usuário inexistente dá `404`; usuário
  inativo dá `422` no campo `usuarioId`.

## Leitura de tag NFC (B17)

O terminal envia o UID e recebe a decisão na resposta (I11). Com a tag `04A1B2C3` do visitante criada acima e uma
autorização do visitante para o local do terminal (veja a seção abaixo), o roteiro com `curl` simula o ESP32. Cada
leitura leva um `Idempotency-Key` novo:

```bash
T=(-H 'X-Terminal-Id: 5eed0000-0000-4000-8000-000000000006'
   -H 'X-Terminal-Key: terminal-dev-key-1234567890abcdef1234567890' -H 'content-type: application/json')
KEY=$(cat /proc/sys/kernel/random/uuid)

curl -s -X POST $B/terminal/nfc "${T[@]}" -H "Idempotency-Key: $KEY" -d '{"uid":"04:a1:b2:c3"}'
# 200 {"resultado":"AUTORIZADO","aberturaMs":5000}   (um uso e um evento NFC)

curl -s -X POST $B/terminal/nfc "${T[@]}" -H "Idempotency-Key: $KEY" -d '{"uid":"04:a1:b2:c3"}'
# a mesma chave: a mesma resposta, sem outro uso e sem outro evento

curl -s -X POST $B/terminal/nfc "${T[@]}" -H "Idempotency-Key: $(cat /proc/sys/kernel/random/uuid)" -d '{"uid":"04FFEEDD"}'
# 200 {"resultado":"NEGADO","motivo":"TAG_DESCONHECIDA"}   (um evento NFC negado, sem usuário)
```

- Uma segunda leitura da mesma tag em menos de `NFC_DEBOUNCE_SECONDS` (3 s), com chave nova, repete a decisão anterior.
- Para cadastrar pelo terminal: ligue o modo (seção anterior) e leia uma tag nova. A resposta é
  `{"resultado":"CADASTRADA"}`, a tag aparece em `GET /nfc-tags` e nenhum evento de acesso é gravado.
- Chave ausente ou fora do formato de UUID dá `422` no campo `Idempotency-Key`; a chave de outro terminal dá `409`.

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
