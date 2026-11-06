<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:17364F,100:0A7C66&height=200&section=header&text=Passe&fontSize=52&fontColor=ffffff&fontAlignY=38&desc=Controle%20de%20Acesso%20Integrado%20%7C%20ABP%202026-2&descAlignY=58&descSize=16&animation=fadeIn" width="100%" />

<br/>

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&size=18&pause=1000&color=09D8C7&center=true&vCenter=true&width=640&lines=Controle+de+acesso+para+edif%C3%ADcios+e+condom%C3%ADnios;QR+Code+que+muda+a+cada+10+segundos;Libera%C3%A7%C3%A3o+por+QR+Code+ou+tag+NFC;Terminal+IoT+%2B+app+mobile+%2B+API)](https://git.io/typing-svg)

<br/>

[![Backend CI](https://github.com/prjDevflow/prj_4dsm/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/prjDevflow/prj_4dsm/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React Native](https://img.shields.io/badge/React%20Native-Expo-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://expo.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

</div>

---

## Sobre o Desafio

> **Passe** é um sistema integrado de controle de acesso para edifícios e condomínios, desenvolvido como projeto da **ABP 2026-2** (Aprendizagem Baseada em Projetos) da **FATEC Jacareí**.

O desafio é construir, de ponta a ponta, uma solução em que uma pessoa entra por uma catraca **sem cartão e sem porteiro**: ela lê o QR Code exibido no terminal com o celular, ou aproxima uma tag NFC, e o sistema decide na hora se libera ou nega a passagem. Toda tentativa, aprovada ou negada, fica registrada.

A solução é formada por três partes que conversam entre si:

- **Terminal de acesso** (ESP32 ou simulador): instalado na catraca, mostra um QR Code que muda a cada 10 segundos, lê tags NFC e abre ou nega a passagem.
- **App mobile**: o administrador cadastra usuários, locais e autorizações; o usuário lê o QR Code da catraca para entrar e consulta as próprias autorizações e o histórico.
- **API**: gera os QR Codes, valida cada tentativa (autorização, período, horário, número de usos e distância de até 100 m), manda o terminal abrir ou negar e registra um evento por tentativa.

---

## Arquitetura

```mermaid
graph TD
    Admin([👤 Administrador]) --> App
    User([👤 Condômino / Visitante]) --> App

    App["📱 App mobile\nReact Native"]
    API["⚙ API\nNode.js + Express"]
    DB[("🗄 PostgreSQL")]
    Term["📟 Terminal de acesso\nESP32 ou simulador"]

    App -- "HTTPS + JWT" --> API
    Term -- "HTTP (polling) + chave do terminal" --> API
    API -- "Prisma ORM" --> DB
    User -. "lê o QR Code / aproxima a tag NFC" .-> Term
```

---

## Funcionalidades

<div align="center">

| 🔐 Autenticação | 👥 Cadastros | 🗺 Locais de acesso |
|:---:|:---:|:---:|
| Login com JWT e perfis | Administrador, condômino e visitante | Edifícios, portarias, portas e catracas |
| **📝 Autorizações** | **📱 Acesso por QR Code** | **💳 Acesso por NFC** |
| Período, horário e número de usos | QR de uso único, renovado a cada 10 s | Tag vinculada ao usuário, resposta em até 2 s |
| **📍 Proximidade** | **📜 Histórico** | **📡 Terminal offline** |
| Só entra quem está a até 100 m do terminal | Tentativas aprovadas e negadas, com filtros | Eventos enviados em lote ao reconectar |

</div>

---

## Requisitos Funcionais

<details>
<summary><b>RF01 a RF05 — Cadastros e autorizações</b></summary>
<br>

- **RF01 — Cadastro de usuários:** perfis administrador, condômino e visitante; usuários são desativados, nunca excluídos.
- **RF02 — Locais de acesso:** edifícios, pontos de acesso (portaria, porta, catraca) e terminais, com coordenadas.
- **RF03 — Criar autorização:** pessoa, local, data de início e fim, hora de início e fim, número de usos e situação.
- **RF04 — Consultar autorizações:** o administrador filtra por pessoa, local, situação e período.
- **RF05 — Cancelar autorização:** o cancelamento tem efeito imediato.

</details>

<details>
<summary><b>RF06 a RF08 — Histórico, autenticação e minhas autorizações</b></summary>
<br>

- **RF06 — Histórico:** consulta das tentativas aprovadas e negadas, com filtros.
- **RF07 — Autenticação:** login seguro, permissões por perfil e limite de tentativas.
- **RF08 — Minhas autorizações:** cada usuário vê somente as próprias.

</details>

<details>
<summary><b>RF09 e RF10 — App</b></summary>
<br>

- **RF09 — Leitura do QR Code:** o usuário aponta a câmera do celular para o QR Code da catraca.
- **RF10 — Tags NFC:** o administrador cadastra e vincula tags NFC aos usuários.

</details>

<details>
<summary><b>RF11 a RF17 — Terminal e validação de acesso</b></summary>
<br>

- **RF11 — Terminal:** identifica-se à API e informa posição e estado.
- **RF12 — QR Code:** gerado pela API, renovado a cada 10 segundos e de uso único.
- **RF13 — Validação por QR Code:** confere autenticidade, validade, local, situação da autorização, usos restantes e proximidade de até 100 m.
- **RF14 — Validação por NFC:** tag, usuário e autorização, com resposta em até 2 segundos.
- **RF15 — Liberação:** a API manda o terminal abrir.
- **RF16 — Negação:** a API manda o terminal negar, com o motivo.
- **RF17 — Registro do evento:** exatamente um evento por tentativa, aprovada ou negada.

</details>

<details>
<summary><b>Requisitos não funcionais</b></summary>
<br>

- **Segurança:** senhas e chaves guardadas apenas como hash, segredos fora do repositório, autenticação do terminal e validação de toda entrada.
- **Confiabilidade:** eventos gerados offline não se perdem e não se duplicam.
- **Persistência:** banco PostgreSQL em nuvem, com migrações versionadas.
- **Qualidade:** código em camadas, desenvolvido com TDD.
- **Entrega:** Docker, pipeline de CI com build, lint e testes (sem testes automatizados o projeto não é aceito) e deploy após o CI verde.

</details>

---

## Stack Tecnológica

<div align="center">

![TypeScript](https://skillicons.dev/icons?i=ts)&nbsp;
![Node.js](https://skillicons.dev/icons?i=nodejs)&nbsp;
![Express](https://skillicons.dev/icons?i=express)&nbsp;
![React](https://skillicons.dev/icons?i=react)&nbsp;
![PostgreSQL](https://skillicons.dev/icons?i=postgresql)&nbsp;
![Prisma](https://skillicons.dev/icons?i=prisma)&nbsp;
![Docker](https://skillicons.dev/icons?i=docker)&nbsp;
![GitHub Actions](https://skillicons.dev/icons?i=githubactions)&nbsp;
![Figma](https://skillicons.dev/icons?i=figma)&nbsp;
![Git](https://skillicons.dev/icons?i=git)&nbsp;
![GitHub](https://skillicons.dev/icons?i=github)&nbsp;
![VSCode](https://skillicons.dev/icons?i=vscode)

</div>

---

## Estrutura do Repositório

Cada pasta tem o seu próprio README, com instalação, comandos e documentação da parte.

| Pasta | Conteúdo |
|:---|:---|
| [backend/](backend/) | API e banco de dados |
| [mobile/](mobile/) | App mobile |
| [terminal/](terminal/) | Terminal de acesso (IoT) |
| [infra/](infra/) | Infraestrutura e deploy |
| [docs/](docs/) | Documentação geral do projeto |

---

## Equipe

Projeto desenvolvido pela equipe **DevFlow** — FATEC Jacareí.

<div align="center">

| Integrante | Função |
|:---|:---|
| Eduardo Silva Machado | Dev Back |
| Pedro | Dev Mobile |
| Matheus | Dev IoT |
| Rafael Medeiros | Design |

</div>

---

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0A7C66,100:17364F&height=120&section=footer" width="100%" />

<div align="center">

Desenvolvido pela equipe **DevFlow** · FATEC Jacareí · ABP 2026-2

</div>
