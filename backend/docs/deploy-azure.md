# Deploy em homologação (B10): Azure Container Apps

A API de homologação roda no **Azure Container Apps** (plano de consumo, região **Chile Central**), com a mesma
imagem Docker do `backend/Dockerfile` (estágio `runtime`). A imagem fica no **GitHub Container Registry**
(GHCR, gratuito) e o banco continua no **Neon**. Custo previsto: zero, dentro do crédito do Azure for Students.

| Peça | Onde | Custo |
|---|---|---|
| Conta | Azure for Students (e-mail da Fatec, sem cartão, US$ 100 por ano) | crédito; se acabar, os serviços param e nada é cobrado |
| API | Container App `api-acesso`, 1 réplica fixa, 0,25 vCPU e 0,5 GiB | franquia mensal do plano de consumo + poucos dólares do crédito |
| Imagem | `ghcr.io/prjdevflow/prj_4dsm/backend:<sha>` | grátis (pacote público) |
| Banco | Neon (plano gratuito) | grátis, com cota de computação (veja [Cuidados](#cuidados)) |
| HTTPS | certificado gerenciado do Azure no domínio `*.azurecontainerapps.io` | grátis |

**URL de homologação:** `https://<fqdn>` (preencher depois do primeiro deploy; também em [ambiente-dev.md](ambiente-dev.md#homologação)).

## Como o pipeline funciona

Arquivos: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) (job `deploy`) e
[`.github/workflows/cd.yml`](../../.github/workflows/cd.yml).

1. Um push na `develop` que mexeu em `backend/**` roda o CI de sempre.
2. Só se o check `backend-ci` passar, o job `deploy` chama o `cd.yml`. **CI vermelho não publica.** PRs também não publicam.
3. O `cd.yml` gera a imagem `runtime`, publica no GHCR com a tag do SHA do commit (e `develop`), aplica as migrações
   no Neon com a URL **direta** (`npm run db:deploy`), entra no Azure por OIDC e roda `az containerapp update --image`.
4. Ele espera a nova revisão ficar pronta **com a imagem nova** (se a revisão nova não subir, a antiga continua
   recebendo o tráfego, e um `/health` verde enganaria) e roda o teste de fumaça
   ([`scripts/smoke-health.ts`](../scripts/smoke-health.ts)): `GET /api/v1/health` por **HTTPS** precisa responder
   200 com `status: ok` e `db: up`. Qualquer falha deixa o pipeline vermelho.

Ao trocar de revisão, o Azure manda `SIGTERM` para a antiga. A API para os jobs de limpeza, termina as
requisições em andamento, fecha o pool do banco e sai em até 20 s ([`gracefulShutdown.ts`](../src/infra/http/gracefulShutdown.ts)).

## Configuração (uma vez)

Faça na ordem. Os passos 1 a 6 são no [portal do Azure](https://portal.azure.com); o 7 e o 8 no GitHub, com a conta
admin `prjDevflow` (os integrantes têm `write`, que não cria ambientes nem secrets).

### 1. Ativar o Azure for Students

Em <https://azure.microsoft.com/free/students>, entre com o **e-mail institucional da Fatec**. Não pede cartão.
No portal, abra **Subscriptions** e anote o **Subscription ID** (`AZURE_SUBSCRIPTION_ID`). Em **Microsoft Entra ID → Overview**, anote o **Tenant ID** (`AZURE_TENANT_ID`).

### 2. Registrar os provedores

**Subscriptions → (a assinatura) → Settings → Resource providers**: procure e clique em **Register** em
`Microsoft.App` e `Microsoft.OperationalInsights`. Leva um ou dois minutos.

### 3. Criar o grupo de recursos

**Resource groups → Create**: nome `rg-abp-acesso`, região **Brazil South** (a região do grupo guarda só os
metadados e não precisa ser a mesma dos recursos).

**Região dos recursos.** A assinatura Azure for Students tem uma política de regiões permitidas e **recusa a
Brazil South** (`RequestDisallowedByAzure`). Para ver a lista da sua assinatura, abra o Cloud Shell (`>_` no topo do portal):

```bash
az policy assignment list --query "[].parameters" -o json   # campo listOfAllowedLocations
```

Em 2026-11-17 a lista era `chilecentral`, `northcentralus`, `francecentral`, `spaincentral` e `southafricanorth`.
Use **Chile Central** (Santiago, a mais próxima: cerca de 50 ms a mais que São Paulo). Se ela não aparecer no
formulário do Container App ou der erro de disponibilidade, use **North Central US**. O ambiente, o Log Analytics,
o app e a identidade do passo 5 ficam **todos na mesma região**.

### 4. Criar o Container App

**Container Apps → Create**:

- **Basics:** grupo `rg-abp-acesso`, nome `api-acesso`, região **Chile Central** (ou a alternativa do passo 3). Em *Container Apps environment*, **Create new**: nome `cae-abp-acesso`, plano **Consumption only**. Na aba *Monitoring* do ambiente, o Log Analytics pode ficar (o volume de log é pequeno).
- **Container:** deixe marcado **Use quickstart image** (a imagem real ainda não existe; o primeiro deploy a troca).
- **Ingress:** *Enabled*, tráfego **Accepting traffic from anywhere**, *Ingress type* HTTP, **Target port `3000`**. (A imagem de exemplo escuta na 80, então a primeira revisão fica não saudável. É esperado.)
- **Review + create**.

Depois de criado, ajuste:

- **Application → Scale:** mínimo **1** e máximo **1** réplica. Sempre ligada responde na hora para o terminal; uma réplica só porque os limites por IP ficam na memória do processo.
- **Application → Containers → Edit and deploy → (container) → Edit:** CPU **0.25**, memória **0.5 Gi**.
- **Settings → Secrets → Add** (tipo *Container Apps Secret*):
  - `database-url`: a URL **pooled** do Neon (host com `-pooler`, com `sslmode=require`).
  - `jwt-secret`: um segredo **novo**, só da homologação: `openssl rand -base64 48`.
- **Containers → Edit and deploy → (container) → Environment variables**:

  | Nome | Origem | Valor |
  |---|---|---|
  | `NODE_ENV` | manual | `production` |
  | `PORT` | manual | `3000` |
  | `TRUST_PROXY` | manual | `1` (o ingress do Azure é um proxy na frente da API; veja [seguranca.md](seguranca.md#2-limites-de-requisição)) |
  | `CORS_ORIGINS` | manual | `https://<fqdn>` (o app nativo não usa CORS; só o navegador precisa) |
  | `LOG_LEVEL` | manual | `info` |
  | `DATABASE_URL` | *Reference a secret* | `database-url` |
  | `JWT_SECRET` | *Reference a secret* | `jwt-secret` |

  As demais variáveis têm padrão no código (`.env.example`). Mude aqui só se o grupo decidir.

- **Overview:** anote o **Application Url** (é o `<fqdn>`).

### 5. Identidade para o GitHub (OIDC, sem senha)

**Managed Identities → Create**: grupo `rg-abp-acesso`, mesma região do Container App, nome `id-github-deploy`. Na identidade:

- **Overview:** anote o **Client ID** (`AZURE_CLIENT_ID`).
- **Federated credentials → Add credential:** cenário **GitHub Actions deploying Azure resources**, com:

  | Campo | Valor |
  |---|---|
  | Issuer URL | `https://token.actions.githubusercontent.com` |
  | Organization / Organization ID | `prjDevflow` / `202716861` |
  | Repository / Repository ID | `prj_4dsm` / `1421434373` |
  | Entity / Environment | Environment / `homologacao` |
  | Audience | o padrão (`api://AzureADTokenExchange`) |

  O formulário gera o subject no formato com IDs (`repo:prjDevflow@202716861/prj_4dsm@1421434373:environment:homologacao`),
  mas o GitHub, por padrão, manda o formato clássico. Crie **duas credenciais**: `homologacao` como o formulário gera e
  `homologacao-classico` com **Edit (optional)** no *Subject identifier* = `repo:prjDevflow/prj_4dsm:environment:homologacao`.
  Depois do primeiro deploy, a que não foi usada pode ser apagada (o erro `AADSTS700213` no `azure/login` mostra o subject recebido).

No grupo `rg-abp-acesso`: **Access control (IAM) → Add role assignment → Contributor →** *Managed identity* `id-github-deploy`.
O papel vale só para o grupo, não para a assinatura inteira.

### 6. Banco: conferir as duas URLs do Neon

No painel do Neon, copie a URL **direta** (sem `-pooler`) para o passo 7 e confira que a **pooled** está no secret `database-url`.

### 7. GitHub: ambiente `homologacao`

**Settings → Environments → New environment** `homologacao`. Em *Deployment branches*, escolha **Selected branches** e adicione `develop`.

- **Environment secrets:** `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `DATABASE_URL_DIRECT` (URL direta do Neon).
- **Environment variables:** `AZURE_RESOURCE_GROUP` = `rg-abp-acesso`, `AZURE_CONTAINERAPP_NAME` = `api-acesso`.

Se faltar algum, o primeiro passo do `cd.yml` falha e diz qual.

### 8. Primeiro deploy e imagem pública

Faça o merge do PR da B10 na `develop`. O primeiro deploy publica a imagem no GHCR como **privada**, e o Azure não
consegue baixá-la; o passo "Esperar a nova revisão" falha. Então:

1. **GitHub → organização prjDevflow → Packages → `prj_4dsm/backend` → Package settings → Change visibility → Public.** A imagem não tem segredo (os segredos estão só no Azure).
2. Em **Actions**, abra a execução que falhou e clique em **Re-run failed jobs**.

Pronto: a partir daí cada merge na `develop` publica sozinho.

## Verificar

```bash
curl -s https://<fqdn>/api/v1/health    # {"status":"ok", ..., "db":"up"}
curl -s https://<fqdn>/api/v1/ready     # 200 com o banco no ar
```

O Swagger fica em `https://<fqdn>/docs`.

## Rollback

Toda imagem publicada fica no GHCR com a tag do SHA do commit. Para voltar para uma versão anterior:

- **Pelo GitHub (preferido):** Actions → **Backend CD** → *Run workflow* → em `tag`, o SHA completo do commit bom.
  Ele pula o build e as migrações, publica aquela imagem e roda o teste de fumaça. (O botão só aparece quando o
  `cd.yml` estiver também na `main`, que é a branch padrão.)
- **Pelo portal:** Container App → **Revisions and replicas** → ative a revisão anterior (o nome traz os 7 primeiros caracteres do SHA).

Migrações **não** voltam sozinhas. Se a versão nova trouxe uma migração que quebrou dados, restaure o banco pelo
histórico do Neon antes ([backup-e-restauracao.md](backup-e-restauracao.md)).

## HTTPS para o ESP32

O certificado do `*.azurecontainerapps.io` é emitido e renovado pela Microsoft. O ESP32 precisa da **raiz** da
cadeia, não do certificado do site (que troca a cada renovação). Para ver a cadeia real depois do primeiro deploy:

```bash
openssl s_client -connect <fqdn>:443 -servername <fqdn> -showcerts </dev/null 2>/dev/null | grep -E '^ *[0-9] s:|i:'
```

Mande ao Matheus o nome da raiz que aparecer no último `i:` (hoje a Microsoft usa raízes da DigiCert, mas confira
pela saída, não por este texto) e o PEM dela.

## Cuidados

- **Cota do Neon.** O plano gratuito tem uma cota mensal de horas de computação, e o banco só suspende quando fica
  ocioso. Um terminal mandando heartbeat a cada poucos segundos, 24 horas por dia, mantém o banco acordado e gasta a
  cota antes do fim do mês. **Desligue o terminal quando não houver teste.** Se a cota acabar, o `/health` mostra
  `db: down` e o pipeline fica vermelho.
- **Crédito do Azure.** Confira em **Cost Management** de vez em quando. Uma réplica de 0,25 vCPU sempre ligada gasta
  poucos dólares por mês além da franquia gratuita.
- **Uma réplica só.** Os contadores dos limites por IP ficam na memória do processo; com duas réplicas, cada uma contaria pela metade. Não aumente o máximo de réplicas sem rever isso.
- **Nada de seed na nuvem.** O seed usa credenciais públicas. Veja o [README](../README.md#banco-em-nuvem-neon).
