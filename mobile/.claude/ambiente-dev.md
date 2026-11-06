# Ambiente de desenvolvimento do app mobile

Como instalar, subir o backend e abrir o app no celular pelo Expo Go. Arquitetura e etapas: `docs/ai/`.

## 1. O que instalar

| Ferramenta | Para quê |
|---|---|
| **Node.js 22.18+** e npm 10+ | Rodar o Expo, os testes e o lint |
| **Git** | Branches e PRs |
| **Docker Desktop** | Subir a API e o banco na sua máquina |
| **Expo Go** no celular (Play Store ou App Store) | Abrir o app no celular sem build nativo |
| VS Code com ESLint e Prettier | Editor |

O celular e o computador precisam estar **na mesma rede Wi-Fi**. Se a rede da faculdade bloquear, use o hotspot do celular ou `npx expo start --tunnel`.

## 2. Subir o backend na sua máquina

```bash
cd backend
cp .env.example .env              # troque POSTGRES_PASSWORD e defina JWT_SECRET (32+ caracteres)
docker compose up --build -d      # API + PostgreSQL
docker compose run --rm migrate   # cria as tabelas
docker compose run --rm seed      # usuários e dados de teste
curl http://localhost:3000/api/v1/health
# {"status":"ok","version":"0.1.0","time":"...","db":"up"}
```

Usuários do seed (só para desenvolvimento; detalhes em `backend/docs/ambiente-dev.md`):

| Perfil | E-mail | Senha |
|---|---|---|
| ADMIN | `admin@dev.local` | `Admin-Dev-2026` |
| CONDOMINO | `condomino@dev.local` | `Usuario-Dev-2026` |
| VISITANTE | `visitante@dev.local` | `Usuario-Dev-2026` |

O seed também cria o "Edifício de Testes", a catraca `CAT-01` e uma autorização do visitante nessa catraca (00:00 a 23:59, 100 usos, por um ano).

## 3. O celular precisa achar a API

No celular, `localhost` é o próprio celular. Use o **IP do computador na rede**:

```bash
# Windows: ipconfig    ·    Linux/macOS: ip addr  ou  ifconfig
# mobile/.env
EXPO_PUBLIC_API_URL=http://192.168.0.15:3000/api/v1
```

Se o celular não alcançar a API: libere a porta 3000 no firewall do Windows e confira o `CORS_ORIGINS` do backend (o app nativo não manda `Origin`, então normalmente não é CORS). Quando o Eduardo publicar a homologação (B10), troque pela URL HTTPS dela.

## 4. Expo Go: o que dá e o que não dá

- O Expo Go roda **só a versão do Expo SDK que ele traz**. Crie o projeto com `npx create-expo-app@latest` e não fixe uma versão antiga. Confira o SDK no próprio Expo Go (Configurações) e no `package.json` (`expo`). O README do repositório cita o SDK 57.
- Instale bibliotecas nativas **sempre com `npx expo install <pacote>`**: ele escolhe a versão compatível com o SDK.
- Só use bibliotecas que **já vêm no Expo Go**. Todas as que os documentos do app usam vêm: `expo-camera`, `expo-location`, `expo-secure-store`, `expo-haptics`, `expo-clipboard`, `expo-font`, `react-native-svg`, `@react-native-community/netinfo`, `@react-native-community/datetimepicker`. Se alguma biblioteca pedir *development build* ou `expo prebuild`, **não use** sem falar com o Eduardo.
- O APK instalável da entrega final sai pelo EAS Build na F15. Até lá, Expo Go basta.
