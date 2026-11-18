# Documentação do projeto

Índice de toda a documentação do Passe. Esta pasta guarda o que é do sistema inteiro; o que é de uma parte
só fica na pasta dela (`backend/docs/`, `mobile/`, `terminal/docs/`) e aparece listado aqui.

O desafio exige (RP07): documentação e desenho da arquitetura, diagramas (casos de uso, componentes etc.) e
a descrição da comunicação entre os elementos. A coluna **RP07** marca o que atende a essa exigência.

## Pastas desta documentação

| Pasta | Conteúdo |
|---|---|
| [arquitetura/](arquitetura/) | arquitetura do sistema (G06), casos de uso (G04), diagrama de componentes (G05) e registro de decisões (G08) |
| [testes/](testes/) | roteiro de teste integrado, com as três partes juntas |
| [app-mobile/](app-mobile/) | design do app (telas, decisões, tokens) e usabilidade |
| [apresentacoes/](apresentacoes/) | apresentações das Sprint Reviews |

## Sistema inteiro

| Documento | O que é | RP07 |
|---|---|---|
| [plano-documentacao.md](plano-documentacao.md) | plano das etapas G04 a G10: os documentos que faltam e a regra de escrita (ASD-STE100) | |
| [README do repositório](../README.md) | visão geral, requisitos, stack e diagrama simples da arquitetura | desenho da arquitetura (parcial) |
| [arquitetura/arquitetura-sistema/arquitetura-sistema.md](arquitetura/arquitetura-sistema/arquitetura-sistema.md) | visão do sistema inteiro (app, API e terminal) em 10 seções curtas, com links para o detalhe e a ligação de cada seção aos RNF01 a RNF12 (G06) | documentação e desenho da arquitetura |
| [arquitetura/casos-de-uso/casos-de-uso.md](arquitetura/casos-de-uso/casos-de-uso.md) | atores, diagrama UML e fichas dos 15 casos de uso, com a ligação aos RF e aos motivos de negação (G04) | diagramas (casos de uso) |
| [arquitetura/componentes/componentes.md](arquitetura/componentes/componentes.md) | diagrama UML de componentes, com o papel e a pasta de cada parte e as interfaces (protocolo, autenticação e rotas) (G05) | diagramas (componentes) e comunicação entre os elementos |
| [arquitetura/decisoes/decisoes.md](arquitetura/decisoes/decisoes.md) | 10 decisões de arquitetura (ADR-01 a ADR-10), cada uma com contexto, decisão, alternativas, consequência e link para a origem (G08) | documentação da arquitetura |
| [testes/roteiro-teste-integrado.md](testes/roteiro-teste-integrado.md) | teste manual ponta a ponta: API em homologação, app e terminal (G02) | |
| [apresentacoes/review-2-sprint-2.pdf](apresentacoes/review-2-sprint-2.pdf) | apresentação da Review 2 (11/11) ([.pptx](apresentacoes/review-2-sprint-2.pptx)) | |

## Backend

| Documento | O que é | RP07 |
|---|---|---|
| [backend/README.md](../backend/README.md) | como rodar, homologação, rotas, CI/CD | |
| [arquitetura-backend.md](../backend/docs/arquitetura-backend.md) | camadas, decisões e fluxos da API | arquitetura (backend) |
| [comunicacao.md](../backend/docs/comunicacao.md) | como o app e o terminal falam com a API | comunicação entre os elementos |
| [sequencias.md](../backend/docs/sequencias.md) | diagramas de sequência: QR, NFC e eventos offline | diagramas |
| [modelo-de-dados.md](../backend/docs/modelo-de-dados.md) | diagrama do banco, gerado do Prisma | diagramas |
| [openapi.yaml](../backend/openapi.yaml) | contrato da API (Swagger em `/docs`) | comunicação entre os elementos |
| [eventos-campos.md](../backend/docs/eventos-campos.md) | campos de cada evento de acesso e motivos | |
| [seguranca.md](../backend/docs/seguranca.md) | segurança e monitoramento | |
| [plano-de-testes.md](../backend/docs/plano-de-testes.md) | estratégia e relatório dos testes automáticos | |
| [deploy-azure.md](../backend/docs/deploy-azure.md) | deploy em homologação (Azure Container Apps) | |
| [backup-e-restauracao.md](../backend/docs/backup-e-restauracao.md) | backup e restauração do banco | |
| [ambiente-dev.md](../backend/docs/ambiente-dev.md) | ambiente local com Docker | |

## App mobile

| Documento | O que é |
|---|---|
| [mobile/README.md](../mobile/README.md) | download do `.apk` (só Android), como rodar no celular, estrutura e comandos |
| [app-mobile/design/](app-mobile/design/README.md) | telas, decisões de design e tokens do Figma |
| [app-mobile/usabilidade/](app-mobile/usabilidade/relatorio-F14.md) | relatório de acessibilidade (F14) e roteiro do teste com pessoas |

## Terminal de acesso

| Documento | O que é |
|---|---|
| [terminal/README.md](../terminal/README.md) | visão geral do hardware e do firmware |
| [terminal/firmware/README.md](../terminal/firmware/README.md) | instalar, gravar, testar e telas do terminal |
| [terminal/docs/](../terminal/docs/README.md) | pinagem, tags da demonstração e guia do firmware |

## Regras desta pasta

- Nomes de arquivo em minúsculas, com hífen e sem espaço nem acento (`review-3-sprint-3.pdf`).
- Diagrama novo entra com o arquivo-fonte (`.puml` ou Mermaid no `.md`) ao lado da imagem, para poder ser corrigido.
- O que vale é o contrato (`backend/openapi.yaml` e `backend/docs/ai/03-domain-and-contract.md`): um diagrama que diverge dele está errado.
- Tudo entra pela `develop`, por PR; nada é enviado direto para a `main`.
