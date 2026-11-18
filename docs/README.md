# Documentação do projeto

Índice de toda a documentação do Passe. Esta pasta guarda o que é do sistema inteiro; o que é de uma parte
só fica na pasta dela (`backend/docs/`, `mobile/`, `terminal/docs/`) e aparece listado aqui.

O desafio exige (RP07): documentação e desenho da arquitetura, diagramas (casos de uso, componentes etc.) e
a descrição da comunicação entre os elementos. A coluna **RP07** marca o que atende a essa exigência.

## Pastas desta documentação

| Pasta | Conteúdo |
|---|---|
| `arquitetura/` | arquitetura do sistema inteiro, diagrama de componentes e casos de uso (em construção, etapas G04 em diante) |
| [testes/](testes/) | roteiro de teste integrado, com as três partes juntas |
| [app-mobile/](app-mobile/) | design do app (telas, decisões, tokens) e usabilidade |
| [apresentacoes/](apresentacoes/) | apresentações das Sprint Reviews |

## Sistema inteiro

| Documento | O que é | RP07 |
|---|---|---|
| [README do repositório](../README.md) | visão geral, requisitos, stack e diagrama simples da arquitetura | desenho da arquitetura (parcial) |
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
| [mobile/README.md](../mobile/README.md) | como rodar no celular, estrutura e comandos |
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
