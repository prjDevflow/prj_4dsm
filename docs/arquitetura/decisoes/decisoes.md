# Registro de decisões de arquitetura

Este documento junta as decisões que dão forma ao Passe. Antes dele, as decisões estavam na seção 3 do
[contrato](../../../backend/docs/ai/03-domain-and-contract.md#3-decisões-adotadas-resolvem-as-ambiguidades-do-desafio)
e no [STATUS.md](../../../backend/docs/ai/STATUS.md#decisões-registradas-adr-curto) do backend.
Cada registro tem contexto, decisão, alternativas, consequência e origem.

O contrato manda. Se este documento divergir do contrato, vale o contrato.
Uma decisão nova entra aqui com o próximo número e um link para a origem dela.

## Sumário

| ID | Decisão | Situação |
|---|---|---|
| [ADR-01](#adr-01--http-com-polling-e-não-mqtt) | HTTP com polling, e não MQTT | aceita |
| [ADR-02](#adr-02--regra-dos-100-m-como-raio-máximo) | Regra dos 100 m como raio máximo | aceita |
| [ADR-03](#adr-03--posição-do-terminal-gps-com-reserva-no-cadastro) | Posição do terminal: GPS com reserva no cadastro | aceita |
| [ADR-04](#adr-04--qr-code-de-uso-único-com-10-s-e-5-s-de-tolerância) | QR Code de uso único com 10 s e 5 s de tolerância | aceita |
| [ADR-05](#adr-05--terminal-sem-rede-nega-e-envia-o-lote-depois) | Terminal sem rede nega e envia o lote depois | aceita |
| [ADR-06](#adr-06--administração-só-pelo-app) | Administração só pelo app | aceita |
| [ADR-07](#adr-07--azure-container-apps-em-chile-central-e-neon-com-custo-zero) | Azure Container Apps em Chile Central e Neon, com custo zero | aceita |
| [ADR-08](#adr-08--uid-da-tag-nfc-clonável-como-risco-aceito) | UID da tag NFC clonável como risco aceito | aceita |
| [ADR-09](#adr-09--nfc-recebe-a-decisão-na-resposta-sem-comando) | NFC recebe a decisão na resposta, sem comando | aceita |
| [ADR-10](#adr-10--um-evento-por-tentativa-e-aprovação-atômica) | Um evento por tentativa e aprovação atômica | aceita |

---

## ADR-01 — HTTP com polling, e não MQTT

- **Contexto:** o terminal precisa saber em até 2 s que o app validou um QR Code. O app já fala com a API por
  HTTPS e JSON.
- **Decisão:** o terminal também usa só HTTPS. Ele busca os comandos em `GET /terminal/commands` a cada 1 s
  (`commandPollMs`) e pede o QR Code a cada 10 s.
- **Alternativas:** MQTT, com um broker entre a API e o terminal. O broker seria mais um serviço para
  hospedar, proteger e monitorar.
- **Consequência:** a API tem um só protocolo e um só formato de erro. O terminal faz cerca de 70 requisições
  por minuto, abaixo do limite de 300 (`TERMINAL_MAX_PER_MINUTE`). O comando chega com até 1 s de atraso.
- **Origem:** glossário do
  [contrato](../../../backend/docs/ai/03-domain-and-contract.md#1-glossário) ("Terminal de Acesso") e
  [comunicacao.md](../../../backend/docs/comunicacao.md#terminal).

## ADR-02 — Regra dos 100 m como raio máximo

- **Contexto:** o desafio cita uma regra dos 100 m, mas não diz se é distância máxima ou mínima.
- **Decisão:** o celular precisa estar a no máximo 100 m da posição do terminal. A API calcula a distância
  pela fórmula de Haversine. A variável `MAX_DISTANCE_M` guarda o valor, e a ponta de 100 m passa.
- **Alternativas:** distância mínima de 100 m. Essa leitura não protege contra o uso do QR à distância.
- **Consequência:** a API nega com `DISTANTE_DO_TERMINAL` quando o celular está longe. A regra vale só para o
  QR Code (decisão 4 do contrato), porque o NFC não tem a posição do celular.
- **Origem:** decisões 1 e 4 do
  [contrato](../../../backend/docs/ai/03-domain-and-contract.md#3-decisões-adotadas-resolvem-as-ambiguidades-do-desafio)
  e perguntas 1 e 4 em [STATUS.md](../../../backend/docs/ai/STATUS.md#perguntas-em-aberto), com a resposta
  do professor.

## ADR-03 — Posição do terminal: GPS com reserva no cadastro

- **Contexto:** a regra dos 100 m precisa da posição do terminal. O GPS pode ficar sem sinal dentro do
  edifício.
- **Decisão:** o modo padrão é `GPS_COM_FALLBACK`. A API usa o GPS quando o terminal tem `gpsFix` e enviou o
  último heartbeat há menos de 10 min (`GPS_MAX_AGE_MIN`). Nos outros casos, a API usa as coordenadas do
  ponto de acesso.
- **Alternativas:** `CADASTRO` (sempre as coordenadas do ponto) e `GPS` (só o GPS). A variável
  `TERMINAL_POSITION_SOURCE` escolhe o modo.
- **Consequência:** no modo padrão, a API sempre tem uma posição de referência. No modo `GPS` sem GPS
  utilizável, a API nega com `LOCALIZACAO_INVALIDA`.
- **Origem:** decisão 2 do
  [contrato](../../../backend/docs/ai/03-domain-and-contract.md#3-decisões-adotadas-resolvem-as-ambiguidades-do-desafio),
  pergunta 2 e decisões da B11 e da B15 em [STATUS.md](../../../backend/docs/ai/STATUS.md#decisões-registradas-adr-curto).

## ADR-04 — QR Code de uso único com 10 s e 5 s de tolerância

- **Contexto:** uma pessoa pode fotografar o QR Code do terminal e enviar a foto para outra pessoa.
- **Decisão:** a API gera um token aleatório de 16 bytes para cada QR Code. O QR vale 10 s, mais 5 s de
  tolerância, e só uma leitura aprovada o consome. O banco guarda só o SHA-256 do token.
- **Alternativas:** um QR Code fixo por terminal, ou um QR Code que vale por mais tempo. Os dois deixam a
  foto valer por minutos ou para sempre.
- **Consequência:** a foto perde a validade em até 15 s. Durante a troca, dois QR Codes do mesmo terminal
  valem ao mesmo tempo por poucos segundos. O time aceita esse efeito.
- **Origem:** decisão 5 e seção 4.3 do
  [contrato](../../../backend/docs/ai/03-domain-and-contract.md#43-formato-do-qr-code).

## ADR-05 — Terminal sem rede nega e envia o lote depois

- **Contexto:** sem rede, o terminal não consegue perguntar à API se a tag tem autorização.
- **Decisão:** o terminal nega toda leitura NFC sem rede. Ele guarda o evento com `motivo`
  `TERMINAL_OFFLINE` e um `clientEventId`. Quando a rede volta, ele envia os eventos em
  `POST /terminal/events/batch`.
- **Alternativas:** liberar sem rede com uma cópia local das autorizações. Essa cópia fica velha e não
  controla os usos restantes.
- **Consequência:** sem rede, ninguém entra pelo terminal. A API aceita no lote só eventos `NEGADO`, até 50
  por lote, e usa o `clientEventId` para não gravar o mesmo evento duas vezes.
- **Origem:** decisão 10 do
  [contrato](../../../backend/docs/ai/03-domain-and-contract.md#3-decisões-adotadas-resolvem-as-ambiguidades-do-desafio),
  pergunta 16 em [STATUS.md](../../../backend/docs/ai/STATUS.md#perguntas-em-aberto) e
  [comunicacao.md](../../../backend/docs/comunicacao.md#quando-não-há-rede).

## ADR-06 — Administração só pelo app

- **Contexto:** o administrador cadastra usuários, locais, terminais, autorizações e tags NFC.
- **Decisão:** o administrador faz todo o cadastro pelo app mobile. O projeto não tem painel web.
- **Alternativas:** um painel web à parte. Ele seria mais um cliente para construir, testar e publicar.
- **Consequência:** o app tem telas do perfil `ADMIN` e telas do usuário. A API atende só dois clientes: o
  app (JWT) e o terminal (chave do terminal).
- **Origem:** decisão 11 do
  [contrato](../../../backend/docs/ai/03-domain-and-contract.md#3-decisões-adotadas-resolvem-as-ambiguidades-do-desafio).

## ADR-07 — Azure Container Apps em Chile Central e Neon, com custo zero

- **Contexto:** a API precisa de uma homologação com HTTPS e sem custo. O serviço não pode exigir cartão de
  crédito.
- **Decisão:** a API roda no Azure Container Apps, no plano de consumo, região Chile Central, com 1 réplica.
  A imagem fica no GitHub Container Registry, e o banco fica no Neon, no plano gratuito.
- **Alternativas:** Fly.io, que exige cartão; Render, que hiberna e não tem região na América do Sul. A
  assinatura de estudante do Azure recusa a região Brazil South.
- **Consequência:** a homologação custa zero, dentro do crédito do Azure for Students. A API usa 1 réplica,
  porque os contadores de limite de requisição ficam na memória.
- **Origem:** decisão da B10 de 2026-11-17 em
  [STATUS.md](../../../backend/docs/ai/STATUS.md#decisões-registradas-adr-curto) e
  [deploy-azure.md](../../../backend/docs/deploy-azure.md).

## ADR-08 — UID da tag NFC clonável como risco aceito

- **Contexto:** o leitor RC522 lê o UID da tag. Uma pessoa com o equipamento certo copia esse UID para outra
  tag.
- **Decisão:** o sistema identifica a tag só pelo UID. O time aceita o risco de clonagem e o documenta.
- **Alternativas:** tags com chave criptográfica, como as MIFARE DESFire. Elas custam mais e exigem outro
  firmware.
- **Consequência:** quem tem a cópia de uma tag entra no lugar do dono. Um terminal comprometido também pode
  forjar negações no lote offline em nome de quem tem tag.
- **Origem:** decisão 12 do
  [contrato](../../../backend/docs/ai/03-domain-and-contract.md#3-decisões-adotadas-resolvem-as-ambiguidades-do-desafio)
  e [seguranca.md](../../../backend/docs/seguranca.md#8-limitações-conhecidas).

## ADR-09 — NFC recebe a decisão na resposta, sem comando

- **Contexto:** no QR Code, o app valida e o terminal recebe o comando `ABRIR` ou `NEGAR` por polling. No
  NFC, o próprio terminal faz a pergunta à API.
- **Decisão:** `POST /terminal/nfc` devolve a decisão na resposta: `AUTORIZADO` ou `NEGADO` com o motivo. A
  API não cria comando para o NFC. O terminal envia um `Idempotency-Key` em cada leitura.
- **Alternativas:** criar também um comando para o NFC. A catraca abriria duas vezes: uma pela resposta e
  outra pelo polling.
- **Consequência:** o terminal abre a catraca sem esperar o próximo polling. Uma repetição com a mesma chave
  devolve a decisão anterior e não consome outro uso.
- **Origem:** seções 5.2 e 5.3 do
  [contrato](../../../backend/docs/ai/03-domain-and-contract.md#53-efeitos-de-uma-decisão) e decisões da B17
  em [STATUS.md](../../../backend/docs/ai/STATUS.md#decisões-registradas-adr-curto).

## ADR-10 — Um evento por tentativa e aprovação atômica

- **Contexto:** o histórico de acessos precisa mostrar toda tentativa. Dois celulares podem usar o último
  uso de uma autorização no mesmo instante.
- **Decisão:** cada tentativa grava exatamente um evento. Na aprovação do QR Code, uma só transação consome
  a credencial, consome um uso, grava o evento e cria o comando `ABRIR`.
- **Alternativas:** gravar o evento depois da transação. Uma falha entre os dois passos deixaria uma
  aprovação sem evento.
- **Consequência:** a aprovação nunca acontece sem o evento, e o uso nunca passa do limite. Os testes de
  integração provam a concorrência no PostgreSQL real.
- **Origem:** seção 5.3 do
  [contrato](../../../backend/docs/ai/03-domain-and-contract.md#53-efeitos-de-uma-decisão) e
  [arquitetura-backend.md](../../../backend/docs/arquitetura-backend.md#3-decisões-que-moldam-o-código).
