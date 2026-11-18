# Refazer o `.apk` do app apontando para a API de homologação

Este guia é para quem gera o `.apk` Android do app **Passe** (hoje, o Pedro). Ele diz como gerar um `.apk` novo que fala com a API em homologação, como provar que o `.apk` usa a API real e onde publicar o arquivo novo.

**API de homologação:** `https://api-acesso.blackfield-72312729.chilecentral.azurecontainerapps.io/api/v1`

---

## 1. Por que refazer o `.apk`

O app lê a URL da API só da variável `EXPO_PUBLIC_API_URL` ([mobile/src/lib/env.ts](../../mobile/src/lib/env.ts)). Os serviços falsos vêm de `EXPO_PUBLIC_FAKE_SERVICES` ([mobile/src/service/container.ts](../../mobile/src/service/container.ts)).

As variáveis `EXPO_PUBLIC_*` **entram dentro do `.apk` na hora do build**. Depois do build, o `.apk` não lê mais o `.env`. Por isso:

- o `.apk` de 18/11/2026 (versão `0.1.0`) usa a URL que estava no `.env` (ou no `eas.json`) no dia do build;
- se o build foi feito antes da API ir ao ar, a URL é provavelmente um IP local (`http://192.168.x.x:3000/api/v1`) ou o mock (`:4010`). Num celular fora da sua rede, nada funciona. E o Android bloqueia `http://` sem TLS em builds de release, então mesmo na sua rede o login pode falhar;
- trocar o `.env` não conserta o `.apk` antigo. É preciso gerar um `.apk` novo.

> A API de homologação usa `https://`. O Android aceita sem nenhuma configuração extra.

### Regras da URL (o app valida na abertura)

- Começa com `https://`.
- Termina em `/api/v1`. Uma barra no fim (`/api/v1/`) é removida pelo app, mas não use.
- Sem a variável, ou com a URL fora desse formato, o app **fecha na abertura** com a mensagem `EXPO_PUBLIC_API_URL não definida` ou `EXPO_PUBLIC_API_URL inválida`.

### Valores para este build

| Variável                    | Valor                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL`       | `https://api-acesso.blackfield-72312729.chilecentral.azurecontainerapps.io/api/v1` |
| `EXPO_PUBLIC_FAKE_SERVICES` | vazio (todos os serviços reais)                                                    |

---

## 2. Antes de começar (os dois caminhos)

1. Confira que a API está no ar. No navegador, abra:

   `https://api-acesso.blackfield-72312729.chilecentral.azurecontainerapps.io/api/v1/health`

   O resultado esperado é um JSON com `"status"` ok e `"db"` up. Se a API não responder, avise o Eduardo antes do build.

2. Atualize o código e rode os testes:

   ```bash
   git checkout develop
   git pull
   cd mobile
   npm ci
   npm test
   ```

3. Descubra o **nome do pacote Android** (`applicationId`) do `.apk` antigo. O `app.json` do repositório não tem `android.package`, então o nome foi escolhido na sua máquina no primeiro build. Ele está:
   - no `app.json` local da sua máquina (campo `expo.android.package`), se você não descartou a mudança; ou
   - na página do build anterior em [expo.dev](https://expo.dev), se você usou o EAS; ou
   - em `mobile/android/app/build.gradle` (`applicationId`), se você usou o build local.

   Use **o mesmo nome** no build novo. Com o mesmo nome e a mesma chave de assinatura, o `.apk` novo instala por cima do antigo. Com nome ou chave diferentes, desinstale o app antigo do celular antes.

Escolha um dos dois caminhos abaixo. Use o mesmo caminho do build anterior, para manter a mesma chave de assinatura.

---

## 3. Caminho A: EAS Build (na nuvem da Expo, recomendado)

Não precisa de Android Studio nem de JDK. Usa a cota gratuita da Expo.

> O EAS **não envia o `.env`** para a nuvem, porque o `.env` está no `.gitignore`. Por isso, a URL vai no `eas.json`, no perfil do build. Não confie no `.env` neste caminho.

### A.1 Instalar e entrar

```bash
npm install -g eas-cli
eas login
```

### A.2 Ligar o projeto à sua conta Expo (só na primeira vez)

Dentro de `mobile/`:

```bash
eas init
```

Isto grava `expo.extra.eas.projectId` (e às vezes `expo.owner`) no `app.json`. Se você já fez isto no build anterior, pule.

### A.3 Criar ou ajustar o `mobile/eas.json`

Se o arquivo não existe, crie com este conteúdo. Se existe, acrescente o perfil `apk-homologacao`:

```json
{
  "cli": {
    "version": ">= 16.0.0",
    "appVersionSource": "local"
  },
  "build": {
    "apk-homologacao": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api-acesso.blackfield-72312729.chilecentral.azurecontainerapps.io/api/v1",
        "EXPO_PUBLIC_FAKE_SERVICES": ""
      }
    }
  }
}
```

- `buildType: apk` gera um `.apk` instalável direto. Sem ele, o EAS gera um `.aab` (só para a Play Store).
- A URL não é segredo. Pode ficar no `eas.json`.

### A.4 Pôr o nome do pacote no `app.json`

No `mobile/app.json`, dentro de `expo.android`, acrescente o nome do pacote do passo 2.3:

```json
"android": {
  "package": "<o mesmo nome do .apk antigo>",
  "adaptiveIcon": { "...": "sem mudança" }
}
```

Se você não acrescentar, o `eas build` pergunta o nome e grava sozinho.

### A.5 Gerar o `.apk`

```bash
eas build --platform android --profile apk-homologacao
```

- O build leva de 10 a 30 minutos (na fila gratuita, às vezes mais).
- Quando termina, o terminal mostra um link do expo.dev. Na página do build, toque em **Download** para baixar o `.apk`.
- Na página do build, em **Environment variables**, confira que `EXPO_PUBLIC_API_URL` tem a URL de homologação.

---

## 4. Caminho B: build local com Gradle

Precisa de JDK 17 e do Android SDK (Android Studio instalado, com `ANDROID_HOME` configurado). Neste caminho, o build lê o `.env`.

### B.1 Pôr a URL no `.env`

Em `mobile/.env`, deixe exatamente:

```bash
EXPO_PUBLIC_API_URL=https://api-acesso.blackfield-72312729.chilecentral.azurecontainerapps.io/api/v1
EXPO_PUBLIC_FAKE_SERVICES=
```

Depois, confira que **não existe** `mobile/.env.local`, `mobile/.env.production` nem `mobile/.env.production.local`. O Expo lê esses arquivos depois do `.env`, e o valor deles ganha. Se existirem, apague ou corrija a URL neles também.

```bash
ls -a | grep .env        # Linux/macOS/Git Bash
Get-ChildItem -Force .env*   # PowerShell
```

### B.2 Pôr o nome do pacote no `app.json`

Igual ao passo A.4. Sem `android.package`, o `prebuild` pergunta o nome.

### B.3 Gerar a pasta `android/` e o `.apk`

```bash
npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease        # Linux/macOS/Git Bash
.\gradlew.bat assembleRelease    # PowerShell
```

- `--clean` apaga e recria a pasta `android/`. Ela está no `.gitignore` e nunca vai para o Git.
- O `.apk` fica em `mobile/android/app/build/outputs/apk/release/app-release.apk`.
- O build de release do modelo do Expo usa a chave de debug da sua máquina. Se você gerou o `.apk` antigo em outra máquina, desinstale o app antigo antes de instalar o novo.

---

## 5. Provar que o `.apk` novo usa a API real

Faça as três verificações. As duas primeiras não precisam de celular.

### 5.1 Ler a URL dentro do `.apk`

A URL fica como texto dentro do bundle JavaScript do `.apk`:

```bash
unzip -p passe.apk assets/index.android.bundle | strings | grep -oE 'https?://[^" ]+/api/v1'
```

No PowerShell, sem `unzip` nem `strings`, use o Git Bash, que tem os dois. O resultado esperado é **só** a URL de homologação. Se aparecer `192.168.`, `localhost`, `10.0.2.2` ou `:4010`, o build pegou a URL errada.

Faça o mesmo teste no `.apk` antigo para saber para onde ele apontava.

### 5.2 Login com uma conta que só existe na homologação

As contas estão em [backend/README.md](../../backend/README.md), seção das contas da homologação (e-mails `@passe.test`).

1. Instale o `.apk` novo no celular Android (pode ser no 4G, fora da sua rede: é o melhor teste).
2. Entre com `admin1@passe.test` e a senha da tabela.
3. O resultado esperado é a tela inicial do administrador.

Por que este teste prova a API real:

- O login **falso** (`loginUser` em `EXPO_PUBLIC_FAKE_SERVICES`) aceita só os usuários do seed local (`backend/.env.example`). Ele recusa `admin1@passe.test` com "E-mail ou senha inválidos".
- Um `.apk` com IP local ou com o mock não alcança nada fora da sua rede. Ele mostra erro de conexão.

### 5.3 Ver dados reais

Ainda como `admin1@passe.test`, abra a lista de usuários. O resultado esperado são as contas `@passe.test` da homologação. Se aparecerem nomes com e-mail `@email.com`, o app está com o serviço falso `users` ligado: o build pegou um `EXPO_PUBLIC_FAKE_SERVICES` que não está vazio.

Repita o login com `condomino1@passe.test` e `visitante1@passe.test` para ver as telas de cada perfil.

---

## 6. Publicar o `.apk` novo

### 6.1 Google Drive, com o mesmo link

Para o link do README não mudar, **substitua o arquivo** em vez de enviar um novo:

1. No Google Drive da equipe, clique com o botão direito no `.apk` atual.
2. Escolha **Informações do arquivo > Gerenciar versões**.
3. Clique em **Enviar nova versão** e escolha o `.apk` novo.

O link `https://drive.google.com/file/d/1M1OytRAJl5BhUIH2k1wB6q3Zz4Szizgz/view?usp=sharing` continua o mesmo e passa a baixar o arquivo novo. Se você enviar como arquivo novo, o link muda: neste caso, troque o link nos dois lugares do passo 6.2.

### 6.2 Atualizar o `mobile/README.md`

No [mobile/README.md](../../mobile/README.md), na tabela de download, atualize:

- a **data** (dia do build novo);
- o **tamanho** em MB;
- a **versão**, se você mudou `expo.version` no `app.json`;
- o **link**, só se ele mudou (ele aparece no selo do topo e na tabela).

Abra um PR para a `develop` com um ID de etapa próprio, como os outros PRs de docs (exemplo: `[G13] Atualiza o .apk do app para a API de homologação`).

### 6.3 Avisar a equipe

Avise no grupo que o `.apk` novo está no mesmo link e que quem instalou o antigo deve instalar de novo (ou desinstalar antes, se a chave ou o nome do pacote mudaram).

---

## 7. Problemas comuns

| Sintoma                                                       | Causa provável                                                    | O que fazer                                                       |
| ------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| O app fecha logo ao abrir                                     | `EXPO_PUBLIC_API_URL` vazia ou fora do formato no build           | Confira o `eas.json` (caminho A) ou o `.env` (caminho B) e refaça |
| "Aplicativo não instalado" ou "conflita com um pacote"        | Chave de assinatura diferente da do `.apk` antigo                 | Desinstale o app antigo e instale o novo                          |
| Instala como um segundo app "Passe"                           | Nome do pacote diferente do antigo                                | Use o nome antigo no `app.json`, ou desinstale o antigo           |
| Login dá erro de conexão no 4G                                | URL com IP local ou mock (veja o passo 5.1)                       | Refaça o build com a URL de homologação                           |
| Login com `@passe.test` dá "E-mail ou senha inválidos"        | Serviço falso `loginUser` ligado, ou senha copiada errada         | Deixe `EXPO_PUBLIC_FAKE_SERVICES` vazio; confira a senha          |
| Primeiro login demora alguns segundos                         | A API e o banco (Neon) acordam depois de um tempo sem uso         | Espere e tente de novo; é normal na homologação                   |
| `eas build` gera `.aab` em vez de `.apk`                      | Falta `"android": { "buildType": "apk" }` no perfil               | Corrija o `eas.json` e refaça                                     |

---

## 8. O que este guia não muda

Este guia não muda código nem configuração versionada. O `eas.json` e o `android.package` do `app.json` ficam só na máquina de quem faz o build. Versionar esses dois arquivos (para qualquer pessoa da equipe refazer o `.apk` com um comando) é uma decisão da equipe e entra num PR próprio.
