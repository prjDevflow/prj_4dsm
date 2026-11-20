# Roteiro de teste integrado (ponta a ponta, na vida real)

Etapa **G02**. Este roteiro testa as três partes juntas, com pessoas, celulares, tags e o terminal físico:

- **API** em homologação: `https://api-acesso.blackfield-72312729.chilecentral.azurecontainerapps.io/api/v1` (Swagger em [/docs](https://api-acesso.blackfield-72312729.chilecentral.azurecontainerapps.io/docs));
- **app mobile** (React Native + Expo) em celulares reais;
- **terminal de acesso** (ESP32 com OLED, RC522, GPS, servo e buzzer) ligado à homologação.

O roteiro **não repete** os testes automáticos. As regras de cada parte já têm testes escritos por TDD e
executados no CI: backend em [backend/docs/plano-de-testes.md](../../backend/docs/plano-de-testes.md),
app em `mobile/` (Jest e Testing Library) e firmware em `terminal/firmware/test/` (Unity). Aqui só entra o
que esses testes não alcançam: câmera, GPS, rede real, HTTPS, display, servo, buzzer, leitor NFC e o tempo
de resposta medido com as três partes conectadas.

O contrato manda: rotas, campos e códigos de motivo seguem o [`openapi.yaml`](../../backend/openapi.yaml) e o
[`03-domain-and-contract.md`](../../backend/docs/ai/03-domain-and-contract.md). As mensagens esperadas no
app são as da seção 4.4 do contrato, palavra por palavra.

## Sumário

1. [Papéis e material](#1-papéis-e-material)
2. [Pré-condições](#2-pré-condições)
3. [Preparação dos dados](#3-preparação-dos-dados)
4. [Como registrar cada caso](#4-como-registrar-cada-caso)
5. [Casos: cadastros e perfis](#5-casos-cadastros-e-perfis)
6. [Casos: acesso por QR Code](#6-casos-acesso-por-qr-code)
7. [Casos: acesso por NFC](#7-casos-acesso-por-nfc)
8. [Casos: histórico](#8-casos-histórico)
9. [Casos: segurança do terminal](#9-casos-segurança-do-terminal)
10. [Casos: queda de rede](#10-casos-queda-de-rede)
11. [Limpeza](#11-limpeza)
12. [Registro da execução](#12-registro-da-execução)
13. [Rastreabilidade](#13-rastreabilidade)

---

## 1. Papéis e material

| Papel | Quem | Faz |
|---|---|---|
| Condutor | Eduardo | lê o roteiro em voz alta, preenche o resultado obtido, confere o histórico e o Swagger |
| Administrador | Eduardo (celular 1) | cadastros, autorizações, tags e cancelamentos pelo app |
| Usuários | Pedro (celular 2) e uma terceira pessoa (celular 3, se houver) | leem o QR Code e consultam as autorizações |
| Terminal | Matheus | liga o terminal, acompanha a serial (`pio device monitor`) e passa as tags |

| Material | Observação |
|---|---|
| Terminal montado e gravado com o firmware da `develop` | anotar a versão (`firmware` no heartbeat e no boot da serial) |
| Notebook com o terminal na USB | para ver a serial durante os testes |
| Rede Wi-Fi de 2,4 GHz com internet | hotspot de celular serve; redes da faculdade com portal de login não servem |
| 2 ou 3 celulares com o app | Android ou iPhone, com câmera e GPS; anotar modelo e sistema |
| Tags da demonstração | cartão branco `4E7BBB06` e chaveiro `3414D806` ([terminal/docs/tags-demo.md](../../terminal/docs/tags-demo.md)) |
| Um segundo celular ou câmera | para fotografar o QR do terminal nos casos de QR usado e vencido |
| Cronômetro | o do celular serve |

---

## 2. Pré-condições

Confira tudo antes de começar. Uma pré-condição falha bloqueia os casos indicados.

| # | Pré-condição | Como conferir | Bloqueia | OK? |
|---|---|---|---|---|
| PC1 | API de homologação no ar, com o banco | abrir `/api/v1/ready` no navegador: `200` com `"db":"up"`. A primeira chamada pode demorar: o Neon gratuito suspende o banco parado | todos | ✅ a sessão gravou eventos das 21h49 às 22h29 |
| PC2 | Versão da API anotada | `/api/v1/health` mostra `version`; o SHA está no último run do **Backend CD** em **Actions** | — | ✅ `0.1.0`, imagem `13e9fe3` |
| PC3 | App apontando para a homologação | no `mobile/.env`: `EXPO_PUBLIC_API_URL=https://api-acesso.blackfield-72312729.chilecentral.azurecontainerapps.io/api/v1`; reiniciar com `npx expo start --clear` | casos com app | ✅ as leituras de QR do app chegaram à homologação |
| PC4 | Login funciona nos três celulares | entrar com as contas da seção 3; anotar o commit do app (`git rev-parse --short HEAD` em `mobile/`) | casos com app | ✅ entraram `admin1` e `g02visitante`; celulares e commit do app não anotados |
| PC5 | **Terminal fala HTTPS com a homologação** (I14) | o terminal sai de `Iniciando...` e mostra o QR, com `API_BASE_URL` da homologação no `secrets.h`. A homologação só aceita HTTPS. Sem a I14, nenhum caso com o terminal roda na homologação | casos com terminal | ✅ com a branch `feature/I14-https-azure` (PR #80) |
| PC6 | Terminal cadastrado na homologação e com a chave certa | passo P3 da seção 3 | casos com terminal | ✅ o "Terminal 01" autenticou com a chave |
| PC7 | Fila offline do terminal (I12) | o firmware guarda as tags lidas sem rede e envia o lote ao reconectar | IT-50 a IT-52 | ⬜ não testada: nenhum evento `TERMINAL_OFFLINE` |
| PC8 | GPS do terminal (I09) | heartbeat com `gpsFix: true`. **Sem GPS o teste segue**: a API usa as coordenadas do ponto de acesso (`TERMINAL_POSITION_SOURCE=GPS_COM_FALLBACK`) | só muda o IT-24 | ⬜ `gpsFix: false`; a API usou as coordenadas do ponto |
| PC9 | Tags da demonstração livres na homologação | no app, **Tags NFC**: nem `4E7BBB06` nem `3414D806` aparecem. Se aparecerem, desative e anote; o roteiro pressupõe tags novas | IT-40, IT-43 | ✅ as duas tags deram `TAG_DESCONHECIDA` no começo (21h49 e 21h50) |
| PC10 | Celulares com localização e câmera liberadas para o app (ou ainda sem pergunta) | ajustes do sistema | casos de QR | ✅ houve QR autorizado com 0,13 m de distância |

> [!IMPORTANT]
> Limites da API que afetam o teste: cada usuário pode validar **10 QR por minuto** (`429` depois disso) e
> cada IP pode errar a chave do terminal **20 vezes por minuto**. Espere alguns segundos entre leituras do
> mesmo usuário.

> [!NOTE]
> O terminal ligado chama a API a cada segundo e consome a cota do Neon gratuito. Desligue-o quando não
> estiver testando.

---

## 3. Preparação dos dados

Faça pelo app, com `admin1@passe.test` (senhas em [backend/README.md](../../backend/README.md#usuários-da-homologação)).
Os passos de preparação também são teste: se algum falhar, registre como defeito.

| Passo | O que fazer no app (administrador) | Esperado | OK? |
|---|---|---|---|
| P1 | **Locais e terminais → Novo edifício** "Edifício Teste G02", com endereço | edifício na lista | ✅ com outro nome: "Fatec Jacarei" |
| P2 | Novo ponto de acesso "Catraca Teste G02", tipo catraca, no edifício P1. **Ao lado do terminal**, tocar em **Usar minha localização atual** | ponto salvo com as coordenadas do lugar do teste | ✅ com outro nome: "Catraca Lab 108" (`LAB108-CAT01`); coordenadas acertadas na sessão (IT-24) |
| P3 | **Novo terminal** "Terminal Teste G02" no ponto P2. Na tela "Chave do terminal", **Copiar chave** e passar ao Matheus por canal privado (nunca no grupo nem no Git) | a chave aparece uma vez só. Matheus coloca o id e a chave no `secrets.h`, grava e liga | ✅ com outro nome: "Terminal 01" |
| P4 | Conferir o terminal na lista | o terminal aparece **online** em até 30 s depois de ligado | ✅ em contato com a API das 21h49 às 22h33 (firmware `0.3.0`, RSSI −42) |
| P5 | **Usuários → Novo usuário** "G02 Período" (visitante) e "G02 Inativo" (visitante), com e-mails `g02.periodo@passe.test` e `g02.inativo@passe.test` e senhas anotadas só no celular do condutor | usuários na lista, ativos | ⬜ só um usuário: "g02visitante" (`g02.periodo@passe.test`); "G02 Inativo" não foi criado |
| P6 | **Autorizações → Nova autorização**, uma por linha da tabela abaixo, todas para o ponto P2 | cada uma aparece na lista com a situação certa | ⬜ 4 autorizações, diferentes da tabela (ver “Dados usados na sessão de 19/11”) |

| Autorização | Pessoa | Datas | Horário | Usos | Usada em |
|---|---|---|---|---|---|
| A1 | `visitante1@passe.test` | hoje a hoje + 7 dias | 00:00 a 23:59 | 10 | QR (IT-20 a IT-26) e cancelamento (IT-27) |
| A2 | `visitante2@passe.test` | hoje | 00:00 a 23:59 | 1 | usos esgotados (IT-28, IT-44) |
| A3 | `condomino1@passe.test` | hoje a hoje + 7 dias | 00:00 a 23:59 | 10 | NFC (IT-40 a IT-42, IT-46) |
| A4 | G02 Período | **amanhã** a amanhã + 7 dias | 00:00 a 23:59 | 5 | fora do período (IT-29) |
| A5 | G02 Inativo | hoje a hoje + 7 dias | 00:00 a 23:59 | 5 | usuário inativo (IT-30) |
| — | `condomino2@passe.test` | nenhuma autorização | — | — | sem autorização (IT-31) |

### Dados usados na sessão de 19/11/2026

A sessão de 19/11 usou outros nomes e outras contas. Os casos da seção 6 em diante citam estes dados no
resultado obtido.

| O quê | Como ficou na homologação |
|---|---|
| Edifício, ponto e terminal | "Fatec Jacarei", "Catraca Lab 108" (`LAB108-CAT01`) e "Terminal 01" |
| Usuário criado | "g02visitante" (`g02.periodo@passe.test`), visitante |
| Autorização de `visitante2` | 19/11, 08:00 a 23:00, 2 usos (criada às 21h52; os 2 usos foram gastos por NFC) |
| Autorização de `admin1` | 19/11, 08:00 a 23:00, 5 usos (criada às 21h55; 1 uso gasto por QR) |
| 1ª autorização de "g02visitante" | 19/11 a 25/11, 08:00 a 18:00, 10 usos (criada às 22h10, cancelada às 22h23) |
| 2ª autorização de "g02visitante" | 19/11, 08:00 a 23:00, 5 usos (criada às 22h28; 1 uso gasto por NFC) |
| Cartão `4E7BBB06` | vinculado a `visitante2` às 21h53; desativado na sessão |
| Chaveiro `3414D806` | vinculado a "g02visitante" às 22h13; segue ativo |

---

## 4. Como registrar cada caso

Cada caso tem pré-condição, passos e resultado esperado em três lugares: **app**, **terminal** e
**histórico**. Preencha o **obtido** com o que viu (texto da tela, tempo medido, motivo no histórico) e marque:
✅ passou · ❌ falhou (abra um defeito na seção 12) · ⏭ não executado (diga por quê).

O histórico é conferido no app (**Histórico**, como administrador) ou no Swagger (`GET /access-events`,
com o token do `admin1`). Todo caso de acesso deve produzir **exatamente um evento** por tentativa
(RF17).

---

## 5. Casos: cadastros e perfis

### IT-01 · Perfis veem só o que podem (RF07, RF08)

- **Pré-condição:** A1 criada.
- **Passos:** entrar com `visitante1` no celular 2; abrir **Minhas autorizações**; procurar as áreas de administração.
- **Esperado — app:** início da pessoa, sem blocos de administração; A1 aparece em Minhas autorizações com o local "Catraca Teste G02" e os usos restantes; nenhuma autorização de outra pessoa aparece.
- **Obtido:** Emulador, 20/11, com `visitante2`: início da pessoa, sem blocos de administração. Em Minhas autorizações aparece só a dele (Catraca Lab 108, Fatec Jacarei, “Expirada”, “Usadas 2 de 2”); as outras 3 autorizações da base não aparecem. **Situação:** ✅

### IT-02 · Tag repetida é recusada (RF10)

- **Pré-condição:** IT-40 executado (cartão `4E7BBB06` vinculado ao `condomino1`).
- **Passos:** como admin, **Tags NFC → Nova tag** para `visitante2` com o UID `4e:7b:bb:06`.
- **Esperado — app:** o formulário recusa porque a tag já está cadastrada (`409 TAG_JA_CADASTRADA`); nada muda na lista.
- **Obtido:** Emulador, 20/11, com `admin1`: Tags NFC → Vincular tag, pessoa “Condômino 1”, UID `4e:7b:bb:06`. O campo mostrou “Esta tag já está vinculada a alguém.”; a lista e a API seguiram com as mesmas 2 tags. Na sessão, o cartão foi vinculado a `visitante2`, não a `condomino1`. **Situação:** ✅

---

## 6. Casos: acesso por QR Code

Em todos os casos desta seção, a pessoa está **ao lado do terminal**, entra com a conta indicada, toca em
**Abrir catraca** e aponta para o QR da tela do terminal, salvo quando o passo diz outra coisa.

### IT-20 · Acesso autorizado (RF09, RF12, RF13, RF15, RF17)

- **Pré-condição:** A1 ativa, terminal mostrando QR.
- **Passos:** 1. Olhar a tela do terminal por 30 s. 2. `visitante1` lê o QR. 3. Cronometrar da leitura até a catraca abrir.
- **Esperado — terminal:** o QR troca a cada 10 s, com a contagem; depois da leitura, `ACESSO LIBERADO` por 3 s com um bipe, servo abre e fecha sozinho depois de 5 s (`aberturaMs`).
- **Esperado — app:** pede a localização (na primeira vez) e mostra "Acesso autorizado. Pode passar.", o local e os usos restantes (9).
- **Esperado — histórico:** um evento `QR`, `AUTORIZADO`, `visitante1`, "Catraca Teste G02", com `distanciaM` pequena (poucos metros).
- **Obtido:** Sessão de 19/11, 22:01:49: evento `QR`, `AUTORIZADO`, Administrador 1, Catraca Lab 108, Terminal 01, `distanciaM` 0,13. A autorização dele ficou com 1 de 5 usos. A conta usada foi `admin1`, não `visitante1`. tempo leitura → abertura: não anotado **Situação:** ✅

### IT-21 · QR já usado (RF12, RF16)

- **Pré-condição:** A1 ativa.
- **Passos:** 1. Fotografar o QR do terminal com o segundo celular. 2. `visitante1` lê o QR na tela do terminal (aprovado, como no IT-20). 3. Em menos de 15 s, `visitante1` lê a **foto**.
- **Esperado — app:** "Este QR Code já foi usado. Aguarde o próximo e leia de novo."
- **Esperado — terminal:** `ACESSO NEGADO` com o motivo e três bipes; catraca não se mexe.
- **Esperado — histórico:** um `AUTORIZADO` e um `NEGADO` com `CREDENCIAL_REUTILIZADA`; A1 perdeu só um uso.
- **Obtido:** não executado: nenhum evento `CREDENCIAL_REUTILIZADA` na homologação. **Situação:** ⬜

### IT-22 · QR vencido (RF12, RF16)

- **Passos:** 1. Fotografar um QR do terminal. 2. Esperar **20 s** (o QR vale 10 s mais 5 s de tolerância). 3. `visitante1` lê a foto.
- **Esperado — app:** "Este QR Code expirou. Leia o novo QR Code que aparece na tela."
- **Esperado — terminal:** `ACESSO NEGADO` e três bipes; catraca fechada.
- **Esperado — histórico:** `NEGADO`, `CREDENCIAL_EXPIRADA`; usos de A1 não mudam.
- **Obtido:** não executado: nenhum evento `CREDENCIAL_EXPIRADA` na homologação. **Situação:** ⬜

### IT-23 · QR falsificado (RF13, RF16)

- **Passos:** num gerador de QR qualquer, criar um QR com o texto `ACS1:AAAAAAAAAAAAAAAAAAAAAA` (`ACS1:` e 22 letras). `visitante1` lê esse QR.
- **Esperado — app:** "Este QR Code não é válido. Aponte para o QR Code da catraca."
- **Esperado — terminal:** **nada acontece** (a API não sabe de qual terminal é o QR, então não manda comando).
- **Esperado — histórico:** `NEGADO`, `CREDENCIAL_INVALIDA`, sem local e sem terminal.
- **Variação:** um QR com outro texto qualquer (um link) é recusado pelo próprio app, sem chamar a API e sem evento.
- **Obtido:** não executado: nenhum evento `CREDENCIAL_INVALIDA` na homologação. **Situação:** ⬜

### IT-24 · Longe do terminal (RF13, regra dos 100 m)

- **Pré-condição:** se o terminal **não** tem GPS (PC8), a referência é o ponto de acesso.
- **Passos:** 1. Como admin, editar o ponto "Catraca Teste G02" e trocar as coordenadas por um lugar a uns **300 m** (por exemplo, a esquina seguinte, pelo mapa). 2. `visitante1` lê o QR ao lado do terminal. 3. Voltar o ponto às coordenadas originais (**Usar minha localização atual** ao lado do terminal) e repetir a leitura.
- **Esperado — app (passo 2):** "Você está longe da catraca. Aproxime-se e tente de novo."
- **Esperado — terminal (passo 2):** `ACESSO NEGADO` e três bipes.
- **Esperado — passo 3:** autorizado.
- **Esperado — histórico:** `NEGADO` com `DISTANTE_DO_TERMINAL` e `distanciaM` perto de 300; depois um `AUTORIZADO`.
- **Se o terminal tem GPS com fix:** a API usa o GPS e a edição do ponto não muda nada. Nesse caso, leve o terminal (no power bank) para mais de 100 m do celular, ou use **Simular posição → A 200 m** no app aberto pelo Expo Go, e anote qual foi usado.
- **Obtido:** Sessão de 19/11, 21:57:29: `NEGADO`, `DISTANTE_DO_TERMINAL`, `distanciaM` 1.106 (não 300). Às 22:01:49, com o ponto nas coordenadas do lugar do teste: `AUTORIZADO`, `distanciaM` 0,13. Conta: `admin1`. Terminal sem GPS (`gpsFix: false`): a referência foi o ponto de acesso. **Situação:** ✅

### IT-25 · Sem localização (RF13)

- **Passos:** `visitante1` lê o QR e, no pedido de localização do app, toca em **Agora não** (ou desliga a localização do celular).
- **Esperado — app:** "Não conseguimos confirmar sua localização. Ative o GPS e tente de novo."
- **Esperado — terminal:** `ACESSO NEGADO` e três bipes.
- **Esperado — histórico:** `NEGADO`, `LOCALIZACAO_INVALIDA`.
- **Obtido:** Sessão de 19/11, 22:20:29: evento `QR`, `NEGADO`, `LOCALIZACAO_INVALIDA`, Administrador 1. **Situação:** ✅

### IT-26 · Câmera negada (RF09)

- **Passos:** negar a câmera nos ajustes do sistema e tocar em **Abrir catraca**.
- **Esperado — app:** explica que precisa da câmera e oferece o caminho para liberar; não trava. Nenhuma chamada à API, nenhum evento.
- **Obtido:** Emulador, 20/11, com a câmera negada nos ajustes: “Precisamos da câmera para ler o QR Code da catraca.” → **Permitir câmera** → “Sem acesso à câmera, não é possível ler o QR Code.”, com **Abrir configurações** (abriu os ajustes do Android) e **Voltar** (voltou ao início). Nenhum evento novo: 19 antes e 19 depois. **Situação:** ✅

### IT-27 · Cancelamento vale na hora (RF05, RF16)

- **Pré-condição:** IT-20 a IT-25 executados (A1 ainda é usada neles).
- **Passos:** 1. Admin cancela A1 (**Autorizações → A1 → Cancelar autorização**). 2. Logo em seguida, `visitante1` lê o QR.
- **Esperado — app:** "Sua autorização foi cancelada. Procure a administração."; em Minhas autorizações, A1 aparece cancelada.
- **Esperado — terminal:** `ACESSO NEGADO` e três bipes.
- **Esperado — histórico:** `NEGADO`, `AUTORIZACAO_CANCELADA`.
- **Obtido:** Sessão de 19/11: `admin1` cancelou a autorização de “g02visitante” às 22:23:23. Às 22:24:39: evento `QR`, `NEGADO`, `AUTORIZACAO_CANCELADA`, g02visitante. Conta: “g02visitante”, não `visitante1`. **Situação:** ✅

### IT-28 · Usos esgotados (RF13)

- **Passos:** `visitante2` lê o QR (aprovado, A2 tinha 1 uso); espera o próximo QR e lê de novo.
- **Esperado:** primeira leitura autorizada e catraca abre; segunda: "Você já usou todas as entradas desta autorização.", `ACESSO NEGADO` no terminal.
- **Esperado — histórico:** um `AUTORIZADO` e um `NEGADO` com `USOS_ESGOTADOS`; A2 aparece esgotada.
- **Obtido:** não executado por QR: nenhum `USOS_ESGOTADOS` com método `QR`. O motivo foi visto por NFC (IT-44). **Situação:** ⬜

### IT-29 · Fora do período (RF13)

- **Passos:** "G02 Período" (A4 começa amanhã) lê o QR.
- **Esperado — app:** "Sua autorização não vale para esta data ou horário."; terminal nega.
- **Esperado — histórico:** `NEGADO`, `FORA_DO_PERIODO`.
- **Obtido:** não executado por QR. O motivo apareceu por NFC às 22:14:04: `NFC`, `NEGADO`, `FORA_DO_PERIODO`, g02visitante (autorização das 08:00 às 18:00, leitura às 22h14). Falta a leitura por QR, com a mensagem no app. **Situação:** ⬜

### IT-30 · Usuário desativado (RF01, RF13)

- **Passos:** 1. "G02 Inativo" entra no app e abre **Abrir catraca** (deixa o leitor aberto). 2. Admin desativa "G02 Inativo" em **Usuários**. 3. A pessoa lê o QR. 4. Depois, a pessoa tenta abrir outra tela.
- **Esperado — passo 3:** "Seu cadastro está inativo. Procure a administração."; terminal nega; evento `NEGADO`, `USUARIO_INATIVO`.
- **Esperado — passo 4:** a sessão cai e o app volta ao login (a API responde `401` a uma conta inativa).
- **Obtido:** não executado: nenhum evento `USUARIO_INATIVO`; “G02 Inativo” não foi criado. **Situação:** ⬜

### IT-31 · Sem autorização para o local (RF13)

- **Passos:** `condomino2` (sem nenhuma autorização) lê o QR.
- **Esperado — app:** "Você não tem autorização para este local."; terminal nega.
- **Esperado — histórico:** `NEGADO`, `SEM_AUTORIZACAO`.
- **Obtido:** Sessão de 19/11, 21:54:22: evento `QR`, `NEGADO`, `SEM_AUTORIZACAO`, Administrador 1 (a autorização dele só foi criada às 21:55:57). Conta: `admin1`, não `condomino2`. **Situação:** ✅

---

## 7. Casos: acesso por NFC

No NFC não há celular na leitura: o terminal manda o UID à API e age pela resposta. A regra dos 100 m não
vale no NFC (decisão 4 do contrato).

### IT-40 · Vincular a tag pelo terminal (RF10)

- **Pré-condição:** PC9 conferida.
- **Passos:** admin abre **Tags NFC → Ler tag no terminal**, escolhe `condomino1` e o "Terminal Teste G02"; em até 60 s, Matheus encosta o **cartão branco**.
- **Esperado — terminal:** `Tag cadastrada` por 3 s com dois bipes; catraca não se mexe.
- **Esperado — app:** a tela confirma; a tag `4E7BBB06` aparece na lista, ativa, de `condomino1`.
- **Esperado — histórico:** **nenhum** evento (cadastrar não é tentativa de acesso).
- **Obtido:** as duas tags foram vinculadas na sessão (`4E7BBB06` a `visitante2` às 21:53:04; `3414D806` a “g02visitante” às 22:13:55), e o cadastro não gerou evento. Os registros não dizem se o vínculo foi por **Ler tag no terminal** ou digitando o UID. Falta confirmar. **Situação:** ⬜

### IT-41 · Acesso autorizado por NFC em até 2 s (RF14, RF15)

- **Passos:** encostar o cartão branco 5 vezes, esperando a tela voltar ao QR entre uma e outra. Cronometrar do bipe de `Tag lida...` até `ACESSO LIBERADO`.
- **Esperado — terminal:** `Tag lida...` com o UID, depois `ACESSO LIBERADO` e um bipe; catraca abre por 5 s. Cada tempo **até 2 s**.
- **Esperado — histórico:** 5 eventos `NFC`, `AUTORIZADO`, `condomino1`; A3 com 5 usos a menos.
- **Obtido:** 3 leituras autorizadas na sessão (`NFC`, `AUTORIZADO`): 21:53:26 e 21:53:48 (`visitante2`) e 22:29:30 (g02visitante). Faltam as 5 leituras seguidas com o tempo de cada uma. tempos: não anotados **Situação:** ⬜

### IT-42 · Leitura repetida rápida (RF10, debounce)

- **Passos:** encostar o cartão, tirar e encostar de novo assim que a tela voltar ao QR, em menos de 3 s da primeira leitura.
- **Esperado:** a segunda leitura repete a decisão da primeira sem gastar outro uso; no histórico, **um só** evento para as duas.
- **Obs.:** o terminal só lê a tag seguinte quando a tela volta ao QR (3 s de resultado). Se não der para encostar de novo dentro dos 3 s, marque ⏭ e anote: o caso já é coberto pelos testes de integração do backend.
- **Obtido:** sem registro de leitura repetida em menos de 3 s. As leituras de 21:53:26 e 21:53:48 (22 s de intervalo) gastaram 2 usos, como esperado fora da janela. **Situação:** ⬜

### IT-43 · Tag desconhecida (RF14, RF16)

- **Passos:** encostar o **chaveiro** `3414D806` (sem vínculo).
- **Esperado — terminal:** `ACESSO NEGADO` com o motivo e três bipes; catraca fechada.
- **Esperado — histórico:** `NFC`, `NEGADO`, `TAG_DESCONHECIDA`, sem pessoa.
- **Obtido:** Sessão de 19/11: 6 eventos `NFC`, `NEGADO`, `TAG_DESCONHECIDA`, sem pessoa (21:49:59, 21:50:05, 21:53:37, 22:01:32, 22:12:11 e 22:12:54). **Situação:** ✅

### IT-44 · Usos esgotados por NFC (RF14)

- **Passos:** admin vincula o chaveiro a `visitante2` digitando o UID (**Tags NFC → Nova tag**); encostar o chaveiro.
- **Esperado:** terminal nega; histórico `NEGADO`, `USOS_ESGOTADOS` (A2 foi gasta no IT-28).
- **Obtido:** Sessão de 19/11, 21:55:15: evento `NFC`, `NEGADO`, `USOS_ESGOTADOS`, `visitante2`. Foi com o cartão `4E7BBB06`, não com o chaveiro, e os 2 usos tinham sido gastos por NFC. **Situação:** ✅

### IT-45 · Tag desativada (RF14)

- **Passos:** admin desativa o chaveiro (**Tags NFC → chaveiro → Tag ativa** desligado, confirmar); encostar o chaveiro.
- **Esperado:** terminal nega; histórico `NEGADO`, `TAG_INATIVA`.
- **Obtido:** Sessão de 19/11, 22:25:09: evento `NFC`, `NEGADO`, `TAG_INATIVA`, `visitante2` (cartão `4E7BBB06`, que segue inativo). **Situação:** ✅

### IT-46 · Autorização cancelada por NFC (RF05, RF14)

- **Passos:** admin cancela A3; encostar o cartão branco.
- **Esperado:** terminal nega na hora; histórico `NEGADO`, `AUTORIZACAO_CANCELADA`.
- **Obtido:** Sessão de 19/11: autorização de “g02visitante” cancelada às 22:23:23; eventos `NFC`, `NEGADO`, `AUTORIZACAO_CANCELADA` às 22:24:07 e às 22:26:36 (chaveiro `3414D806`). **Situação:** ✅

---

## 8. Casos: histórico

### IT-60 · Histórico do administrador (RF06, RF17)

- **Passos:** como admin, abrir **Histórico** e filtrar por terminal "Terminal Teste G02" e pelo período do teste; depois por método `NFC`; depois por resultado `NEGADO`.
- **Esperado:** cada tentativa dos casos IT-20 a IT-52 aparece **uma vez**, do mais recente para o mais antigo, com o motivo em texto; os filtros se combinam. Conte as tentativas anotadas e compare com o total.
- **Obtido:** Emulador, 20/11, com `admin1`: 19 linhas no Histórico, uma por evento, da mais recente à mais antiga, com o motivo em texto. Filtros combinados: método NFC → 14; mais resultado Negado → 11; mais local “Catraca Lab 108” → 11, iguais aos da API. O app não tem filtro por terminal: o filtro usado foi o de local (a sessão teve um terminal só). tentativas anotadas: 19 (eventos da API) · eventos no histórico: 19 **Situação:** ✅

### IT-61 · Meu histórico (RF06, RF08)

- **Passos:** `visitante1` abre **Meu histórico**.
- **Esperado:** só as tentativas do `visitante1` (IT-20 a IT-27), nenhuma de outra pessoa.
- **Obtido:** Emulador, 20/11, com `visitante2` (a sessão não teve tentativas de `visitante1`): 4 tentativas, todas dele (22:25:09, 21:55:15, 21:53:48 e 21:53:26); nenhuma de outra pessoa. **Situação:** ✅

---

## 9. Casos: segurança do terminal

### IT-70 · Conexão segura (RNF02)

- **Passos:** abrir a URL da API no navegador e ver o cadeado; na serial do terminal, conferir que a URL usada começa com `https://` e que a chave aparece mascarada no log.
- **Esperado:** HTTPS válido nos dois; a chave nunca aparece inteira.
- **Obtido:** navegador conferido em 20/11: certificado válido, emitido pela Microsoft, até 25/02/2027 e `http://` redireciona para `https://`. O terminal falou com a homologação por HTTPS (PR #80). Falta conferir na serial que a chave aparece mascarada. **Situação:** ⬜

### IT-71 · Chave trocada (RNF02, RF11)

- **Passos:** 1. Admin abre o terminal no app e toca em **Gerar nova chave**. 2. Observar o terminal. 3. Matheus grava a chave nova no `secrets.h` e religa.
- **Esperado — passo 2:** o terminal mostra `Chave invalida` e para de mostrar QR (a chave antiga deixou de valer). **Passo 3:** volta ao QR e aparece online.
- **Obtido:** sem registro de troca de chave na sessão. **Situação:** ⬜

### IT-72 · Terminal desativado (RF02, RF11)

- **Passos:** admin desativa o terminal; observar; reativar.
- **Esperado:** `Terminal desativado` na tela e nenhum QR; depois de reativar, volta sozinho ao QR (nova tentativa a cada minuto).
- **Obtido:** sem registro de desativação do terminal na sessão (ele está ativo). **Situação:** ⬜

---

## 10. Casos: queda de rede

Depende da fila offline do firmware (PC7). Use o cartão branco com uma autorização válida (crie uma A6
para `condomino1`, igual à A3, se a A3 já estiver cancelada).

### IT-50 · Terminal sem rede nega (RNF03)

- **Passos:** desligar o hotspot por 60 s; durante a queda, encostar o cartão branco 3 vezes.
- **Esperado — terminal:** o QR some e aparece `Sem Wi-Fi` (ou `Sem servidor`); cada tag dá `ACESSO NEGADO` com `Sem conexao`; a catraca não abre.
- **Esperado — app (admin):** o terminal aparece **offline** na lista depois de uns 30 s.
- **Obtido:** não executado: nenhum evento `TERMINAL_OFFLINE` (PC7). **Situação:** ⬜

### IT-51 · Terminal volta sozinho e envia o que guardou (RNF03, RF17)

- **Passos:** religar o hotspot e esperar.
- **Esperado:** o terminal volta ao QR sem reiniciar; aparece online no app; no histórico surgem as 3 tentativas do IT-50 como `NFC`, `NEGADO`, `TERMINAL_OFFLINE`, com o horário da leitura (não o do envio).
- **Obtido:** não executado (depende do IT-50). **Situação:** ⬜

### IT-52 · Sem duplicar (RNF03)

- **Passos:** derrubar o hotspot logo depois de o terminal voltar (no meio do envio, se der) e religar.
- **Esperado:** as 3 tentativas aparecem **uma vez cada** no histórico, mesmo que o terminal reenvie.
- **Obtido:** não executado (depende do IT-50). **Situação:** ⬜

### IT-53 · App sem internet

- **Passos:** pôr o celular do `visitante1` em modo avião e tocar em **Minhas autorizações** e em **Abrir catraca**.
- **Esperado:** mensagem clara de falta de conexão, com opção de tentar de novo; o app não trava nem mostra dado falso.
- **Obtido:** Emulador, 20/11, com `visitante2` em modo avião. O início mostrou a faixa “Sem internet”. **Minhas autorizações** abriu com os dados carregados antes, sem aviso e sem “tentar de novo” (defeito 1). **Abrir catraca** abriu o leitor sem aviso; ao validar: “Acesso não validado. Sem conexão. Verifique sua internet e leia o QR Code de novo.”, com **Ler outro QR Code**. Abrir o app do zero: “Sem conexão com o servidor. Verifique sua internet e tente de novo.”, com **Tentar novamente**, que funcionou quando a rede voltou. O app não travou nem mostrou dado falso. **Situação:** ❌

---

## 11. Limpeza

Usuários, autorizações e eventos não se apagam (são histórico). Deixe a homologação assim:

- [ ] desativar os usuários "G02 Período" e "G02 Inativo";
- [ ] cancelar as autorizações que sobraram (A4, A5, A6);
- [ ] desativar as duas tags, se forem usadas em outra demonstração com outras pessoas, ou mantê-las e anotar o vínculo em [tags-demo.md](../../terminal/docs/tags-demo.md);
- [ ] manter o "Terminal Teste G02" só se ele for o terminal da demonstração; se não, desativá-lo;
- [ ] desligar o terminal (cota do Neon).

---

## 12. Registro da execução

Este registro junta duas fontes:

- **Sessão de 19/11/2026**, com o terminal físico, no laboratório. Os resultados vêm do que ficou gravado na
  homologação (eventos, autorizações, tags e terminal), consultado em 20/11. O que o display, o servo e o
  buzzer mostraram foi visto na hora por quem estava na sessão.
- **Casos de tela de 20/11/2026**, no emulador Android, com o `.apk` apontando para a homologação: IT-01,
  IT-02, IT-26, IT-53, IT-60 e IT-61. Eles só leem dados e não criaram nenhum evento.

Legenda deste registro: ✅ passou, com prova · ❌ falhou · ⬜ ainda não executado, ou sem registro que prove.

### Ambiente

| Item | Valor |
|---|---|
| Data e hora (início e fim) | 19/11/2026, das 21h49 às 22h33 (sessão com o terminal); 20/11/2026, das 17h50 às 18h30 (casos de tela) |
| Local e rede | 19/11: laboratório 108 da Fatec Jacareí (pelo cadastro do ponto), no Wi-Fi do laboratório (PR #80). 20/11: emulador no PC do Pedro |
| API: `version` e SHA da imagem | `0.1.0`, imagem `13e9fe3` (deploy de 17/11, 22h02) |
| App: commit e como rodou (Expo Go ou build) | 19/11: não anotado. 20/11: `.apk` `0.1.0` (versionCode 2), commit `37e63af` da `feature/F15-build` |
| Firmware: versão e commit | `0.3.0`, branch `feature/I14-https-azure` (PR #80) |
| Celulares (modelo e sistema) | 19/11: não anotado. 20/11: emulador Android 14 (1080 × 2400) |
| Pessoas presentes | não anotado |

### Resumo

| Caso | Situação | Caso | Situação | Caso | Situação |
|---|---|---|---|---|---|
| IT-01 | ✅ | IT-26 | ✅ | IT-45 | ✅ |
| IT-02 | ✅ | IT-27 | ✅ | IT-46 | ✅ |
| IT-20 | ✅ | IT-28 | ⬜ | IT-50 | ⬜ |
| IT-21 | ⬜ | IT-29 | ⬜ | IT-51 | ⬜ |
| IT-22 | ⬜ | IT-30 | ⬜ | IT-52 | ⬜ |
| IT-23 | ⬜ | IT-31 | ✅ | IT-53 | ❌ |
| IT-24 | ✅ | IT-40 | ⬜ | IT-60 | ✅ |
| IT-25 | ✅ | IT-41 | ⬜ | IT-61 | ✅ |
| | | IT-42 | ⬜ | IT-70 | ⬜ |
| | | IT-43 | ✅ | IT-71 | ⬜ |
| | | IT-44 | ✅ | IT-72 | ⬜ |

Total: 14 ✅ · 1 ❌ · 15 ⬜ (não executados ou sem registro)

### Defeitos encontrados

Cada defeito vira um card no Trello e volta para a etapa responsável (B, F ou I) antes de repetir o caso.

| # | Caso | O que aconteceu | Parte (API, app, terminal) | Etapa | Card / PR | Corrigido em |
|---|---|---|---|---|---|---|
| 1 | IT-53 | Sem internet, **Minhas autorizações** mostra os dados carregados antes, sem aviso de falta de conexão e sem “tentar de novo”. O leitor também abre sem aviso. O aviso existe no início, na validação e na abertura do app | app | F15 | | |
| 2 | PC1 | Em 20/11, das 17h50 às 18h20, a API ficou fora do ar 4 vezes (`503 App port is not ready`), por 3 a 5 minutos cada, depois de 4 a 6 minutos no ar. Havia requisições a cada 8 a 50 s, então não é só a suspensão por falta de uso | API (Azure) | B10 | | |

Observações que não são defeito:

- **IT-60:** o roteiro pede o filtro por terminal, mas o Histórico do app filtra por período, resultado,
  pessoa, local, método e motivo. Ou o roteiro passa a pedir o filtro por local, ou o filtro por terminal
  entra no app.
- **Seção 3:** a sessão de 19/11 não criou os dados com os nomes do roteiro. Para os casos que faltam, crie
  o que falta (A1 a A5 e “G02 Inativo”) ou adapte os passos aos dados que já existem.

Casos que faltam, por motivo:

- **Não executados na sessão** (nenhum evento com o motivo esperado): IT-21, IT-22, IT-23, IT-28, IT-29
  (por QR), IT-30, IT-50, IT-51 e IT-52.
- **Sem registro que prove** (se alguém fez e viu, preencha o obtido e marque): IT-40, IT-41 (tempos),
  IT-42, IT-70 (serial), IT-71 e IT-72.

### Evidências

Prints de 20/11 (emulador) em [`evidencias/2026-11-20/`](evidencias/2026-11-20/): histórico do IT-60 (sem filtro e com NFC + Negado), IT-61, IT-01, IT-02, IT-26 e IT-53. Da sessão de 19/11 não há vídeo nem serial guardados.

Guarde em `docs/testes/evidencias/<data>/`: vídeo curto do IT-20 e do IT-41 (catraca abrindo), print do
histórico filtrado do IT-60, a serial do terminal (`pio device monitor` salvo em arquivo) e prints das
mensagens de negação no app.

---

## 13. Rastreabilidade

| Requisito | Casos |
|---|---|
| RF01 Usuários | P5, IT-30 |
| RF02 Locais e terminais | P1 a P4, IT-72 |
| RF03 Criar autorização | P6 |
| RF04 Consultar autorizações | P6 |
| RF05 Cancelar autorização | IT-27, IT-46 |
| RF06 Histórico | IT-60, IT-61 |
| RF07 Autenticação | PC4, IT-01, IT-30 |
| RF08 Minhas autorizações | IT-01, IT-61 |
| RF09 Leitura do QR | IT-20, IT-23, IT-26 |
| RF10 Leitura da tag | IT-02, IT-40, IT-42 |
| RF11 Terminal | P4, IT-20, IT-41, IT-71, IT-72 |
| RF12 QR a cada 10 s, uso único | IT-20, IT-21, IT-22 |
| RF13 Validação por QR | IT-20 a IT-25, IT-27 a IT-31 |
| RF14 Validação por NFC | IT-41 a IT-46 |
| RF15 Liberação | IT-20, IT-41 |
| RF16 Negação | IT-21 a IT-31, IT-43 a IT-46, IT-50 |
| RF17 Um evento por tentativa | todos os casos de acesso, conferidos no IT-60 |
| RNF02 Segurança | IT-70 a IT-72 |
| RNF03 Confiabilidade | IT-50 a IT-53 |
| RNF04 Usabilidade | mensagens dos casos de QR (o teste com pessoas está em [roteiro-teste-com-pessoas.md](../app-mobile/usabilidade/roteiro-teste-com-pessoas.md)) |

Motivos de negação do contrato cobertos aqui: `CREDENCIAL_INVALIDA` (IT-23), `CREDENCIAL_EXPIRADA` (IT-22),
`CREDENCIAL_REUTILIZADA` (IT-21), `USUARIO_INATIVO` (IT-30), `SEM_AUTORIZACAO` (IT-31),
`AUTORIZACAO_CANCELADA` (IT-27, IT-46), `FORA_DO_PERIODO` (IT-29), `USOS_ESGOTADOS` (IT-28, IT-44),
`DISTANTE_DO_TERMINAL` (IT-24), `LOCALIZACAO_INVALIDA` (IT-25), `TAG_DESCONHECIDA` (IT-43),
`TAG_INATIVA` (IT-45) e `TERMINAL_OFFLINE` (IT-51): os 13 da seção 4.4.
