# Documentação do terminal

| Documento | O que é |
|---|---|
| [pinagem.md](pinagem.md) | ligações de cada peça com o ESP32: a referência da montagem |
| [tags-demo.md](tags-demo.md) | UIDs das tags da demonstração, para vincular no app |
| [guia-firmware.md](guia-firmware.md) | plano do firmware, etapas I01 a I15: tarefas, testes e critérios de aceitação |
| [relatorio-firmware-terminal-esp32.pdf](relatorio-firmware-terminal-esp32.pdf) | relatório de firmware de 06/11/2026 (Pedro) |

**Do relatório em PDF, só vale o mapeamento de pinos (páginas 2 e 3)**, já copiado para a
[pinagem.md](pinagem.md). Rotas, tempos, sinais e arquitetura seguem o [guia](guia-firmware.md) e o
contrato do backend (`backend/docs/ai/03-domain-and-contract.md`, seção 4.5, e `backend/openapi.yaml`): as
rotas descritas no PDF não existem no backend.
