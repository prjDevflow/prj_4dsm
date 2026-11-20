# Backup e restauração do banco

O banco é o único estado do sistema (a API não guarda arquivos nem sessões). Perder o banco é perder usuários, autorizações e o histórico de acessos. Este documento diz como copiar e como voltar.

> **Cuidado com o arquivo de backup.** Ele contém dados pessoais (nomes, e-mails), os hashes das senhas e os hashes das chaves dos terminais. Trate-o como segredo: nunca o coloque no repositório (o `.gitignore` ignora `*.dump`), nunca o envie por canais abertos e apague as cópias antigas.

## Copiar (backup)

Use o formato personalizado do `pg_dump` (`-Fc`): é compactado e permite restaurar só uma parte.

### Banco do `docker compose` (desenvolvimento)

```bash
# Gera backup.dump no seu computador, lendo o banco sem parar a API
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > backup.dump
```

### Banco em nuvem (Neon)

Use a URL **direta** (sem `-pooler`), a mesma que serve para migrar. O `pg_dump` precisa ter a versão major igual ou maior que a do servidor (PostgreSQL 17).

```bash
pg_dump -Fc "$DATABASE_URL_DIRETA" > backup.dump
```

Além da cópia manual, confira no painel do provedor o histórico de restauração que o plano contratado oferece (a janela varia por plano) e anote o valor aqui quando a B10 definir o ambiente.

### Quando copiar

| Momento | Por quê |
|---|---|
| Antes de cada migração em homologação ou produção | volta ao estado anterior se a migração der errado |
| Todo dia, de forma automática, quando houver ambiente no ar | limita a perda a um dia de histórico |
| Antes de qualquer `db:reset` ou limpeza manual | o `reset` apaga tudo |

## Restaurar

**Regra de ouro: restaure primeiro num banco novo e confira. Só depois troque o banco da API.** Restaurar por cima do banco em uso apaga o que estiver nele.

```bash
# 1. Cria um banco vazio (no compose)
docker compose exec -T db sh -c 'createdb -U "$POSTGRES_USER" restauracao'

# 2. Restaura o backup nele; para no primeiro erro
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d restauracao --no-owner --exit-on-error' < backup.dump

# 3. Confere: as contagens têm de bater com as do banco de origem
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d restauracao -At -c "select count(*) from users"'
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d restauracao -At -c "select count(*) from access_events"'
```

Em outro servidor (por exemplo, o banco em nuvem), troque os `docker compose exec` por `createdb` e `pg_restore` apontando para a URL direta do banco novo.

Para tornar o banco restaurado o banco da API:

1. Pare a API (`docker compose stop api`) para ninguém gravar durante a troca.
2. Aponte o `DATABASE_URL` da API para o banco restaurado (ou renomeie os bancos).
3. Rode `npm run db:deploy` (ou `docker compose run --rm migrate`). Se o backup é de uma versão anterior do schema, isso aplica as migrações que faltam; se já está em dia, não faz nada.
4. Suba a API e confira `GET /api/v1/ready`: tem de responder `200` com `db: up`.
5. Entre com um usuário real e consulte o histórico (`GET /api/v1/access-events`) para ver os eventos de volta.

## O que a restauração devolve

- **Tudo o que estava no banco:** usuários, locais, terminais, tags, autorizações (com os usos já gastos) e o histórico de acessos. Os eventos são somente inserção, então o histórico volta inteiro até o instante do backup.
- **O que se perde:** o que aconteceu depois do backup. Um terminal que ficou sem rede guarda os eventos e os reenvia (`POST /terminal/events/batch`), mas só as negações; aprovações feitas depois do backup e antes da falha não voltam.
- **Credenciais de QR e comandos** têm vida de segundos e são apagados por um job; não importa se voltarem ou não.
- **Segredos não ficam no banco:** `JWT_SECRET` e as variáveis de ambiente continuam onde estavam. A chave de cada terminal volta como hash, então os terminais continuam autenticando com a chave que já têm.

## Evidência de que o procedimento funciona

Rodado em 2026-11-08 no `docker compose` do desenvolvimento, com PostgreSQL 17:

1. `pg_dump -Fc` do banco `access` gerou um arquivo de cerca de 32 kB.
2. `createdb restore_check` e `pg_restore --no-owner --exit-on-error` terminaram sem erro.
3. As contagens bateram nos dois bancos: 3 usuários, 3 eventos de acesso e 2 migrações em `_prisma_migrations`.
4. O banco `restore_check` e o arquivo foram removidos.

Repita este teste depois de qualquer mudança grande no schema e antes da entrega final.
