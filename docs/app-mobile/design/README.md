# Design do app mobile (Passe)

Telas, componentes e decisões de design do app mobile, feitos no Figma por Rafael. A base são os
"Requisitos para os wireframes do aplicativo móvel" (Eduardo, 22/10/2026), o desafio oficial (versão de
31/08/2026), o [contrato da API](../../../backend/docs/ai/03-domain-and-contract.md) e o plano do
frontend (F01 a F15). O nome "Passe" é provisório.

## Arquivos

| Arquivo | O que tem |
| --- | --- |
| [Figma](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe) | As 31 telas, os componentes, os fundamentos e o protótipo clicável. É a entrega oficial |
| [passe-telas.pdf](passe-telas.pdf) | As telas exportadas do Figma, para ler sem abrir o Figma |
| [passe-decisoes-de-design.pdf](passe-decisoes-de-design.pdf) | O porquê de cada decisão e o que ainda depende de aprovação |
| [tokens.md](tokens.md) | Cores, tipografia, formas, ícones, movimento e componentes, para implementar |

O protótipo tem quatro fluxos. Para abrir, clique em **Present** (▶) no Figma e escolha um:

1. **Pessoa: entrar e abrir a catraca**, que começa na T01.
2. **Pessoa: acesso negado (âmbar)**, que começa na T11.
3. **Pessoa: acesso negado (vermelho)**, que começa na T11 vermelha.
4. **Administrador**, que começa na T14.

## Direção visual

A base é o **Material 3 Expressive, com o tema escuro como padrão**. O tema claro fica como opção em
Minha conta (T13). Três motivos levaram a essa escolha:

- **Idosos (RNF04):** em testes com idosos, seguir os padrões da plataforma foi a regra que mais pesou
  (Ageing Lab, UPM).
- **Velocidade:** nos testes do Google, o M3 Expressive deixou as tarefas 20% mais rápidas. Pessoas com
  mais de 45 anos passaram a achar os controles tão rápido quanto as mais jovens.
- **Concorrentes:** o Kisi e as credenciais da Apple Wallet resolvem o acesso com uma tela clara e um
  único gesto.

Três detalhes são próprios do Passe:

- **Selo "cookie de 12 lados":** aparece no logo, no resultado da catraca, no histórico e nas autorizações.
- **Áreas do administrador:** cada uma tem cor e forma próprias, todas da biblioteca do M3 Expressive.
- **Tela de resultado:** cor cheia, título grande, selo com animação de mola e linhas finas.

O app usa duas escalas:

- **Pessoa (T01 a T13):** escala grande, com corpo de 18 e botões de 60. É usada em pé e com pressa,
  muitas vezes por pessoas idosas.
- **Administrador (T14 a T31):** escala compacta do Material, com corpo de 16 e botões de 48. É usada
  sentado, com formulários e listas.

## Telas

Prioridade conforme a Tabela 6: **E** = essencial, **I** = importante, **X** = extra. Cada ID abre a tela
no Figma.

| ID | Tela | Requisito | Prioridade |
| --- | --- | --- | --- |
| [T01](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=3-140) | Abertura | RF07 | E |
| [T02](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=3-156) | Login | RF07 | E |
| [T03](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=3-184) | Início do usuário | RF08 | E |
| [T04](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=4-15) | Minhas autorizações | RF08 | E |
| [T05](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=4-70) | Detalhe da autorização | RF08 | X |
| [T06](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=4-106) | Permissão da câmera | RF09 | E |
| [T07](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=4-120) | Leitor de QR Code | RF09 | E |
| [T08](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=4-143) | Permissão de localização | RF13 | E |
| [T09](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=4-157) | Validando o acesso | RF13 | E |
| [T10](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=4-172) | Acesso autorizado | RF13, RF15 | E |
| [T11](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=4-193) | Acesso negado (âmbar e [vermelho](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=4-214)) | RF13, RF16 | E |
| [T12](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=4-235) | Meu histórico | RF06 | I |
| [T13](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=4-299) | Minha conta e sair | RF07 | I |
| [T14](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=5-48) | Início do administrador | – | E |
| [T15](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=5-114) | Lista de usuários | RF01 | E |
| [T16](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=5-178) | Cadastro e edição de usuário | RF01 | E |
| [T17](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=5-221) | Locais e terminais | RF02 | E |
| [T18](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=5-304) | Formulário de edifício | RF02 | E |
| [T19](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=5-345) | Formulário de ponto de acesso | RF02 | E |
| [T20](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=5-404) | Lista de terminais | RF02 | E |
| [T21](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=5-453) | Formulário e detalhe do terminal | RF02 | E |
| [T22](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=5-486) | Chave do terminal | RF02, RNF02 | E |
| [T23](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=5-503) | Lista de autorizações | RF04 | E |
| [T24](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=6-153) | Nova autorização | RF03 | E |
| [T25](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=6-221) | Detalhe e cancelamento ([diálogo](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=6-254)) | RF04, RF05 | E |
| [T26](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=6-301) | Histórico de acessos | RF06 | I |
| [T27](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=6-402) | Detalhe da tentativa | RF06 | I |
| [T28](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=6-433) | Lista de tags NFC | RF10 | E |
| [T29](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=6-498) | Formulário de tag NFC | RF10 | E |
| [T30](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=6-530) | Vincular tag no terminal | RF10 | X |
| [T31](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=6-556) | Estados compartilhados | RNF03 | E |

Os [fundamentos](https://www.figma.com/design/jUGhuGVhlFvUe2cZlxgdja/Passe?node-id=6-705) (cores, tipos e
formas) e os componentes (Forma, Botão, Selo de situação, Filtro e Campo) ficam na mesma página do Figma.

## Regras que valem para todas as telas

- **O que a tela pode mostrar:** só o que o perfil pode usar. Quem garante a regra é o servidor, que
  responde 403. Condômino e visitante veem as mesmas telas.
- **Textos:** nenhum código técnico aparece. Os textos de negação são o `message` do contrato (seção 4.4)
  e os termos seguem o Anexo B: "Local" no administrador, "catraca" para quem passa e "Entradas" no lugar
  de "usos".
- **Rede (RNF03):** toda tela que usa a rede tem os estados "Sem internet" e "Tempo esgotado". A
  validação de acesso nunca se repete sozinha: a pessoa lê o QR Code de novo.
- **Nada se exclui:** usuários, locais, terminais e tags só se desativam, e autorização só se cancela.
  Ações sem volta pedem confirmação, e o botão perigoso nomeia a ação.
- **Datas e horas:** formatos dd/MM/aaaa e HH:mm, no fuso de São Paulo, sem o fuso escrito na tela.

## Acessibilidade

| Item | Situação |
| --- | --- |
| Contraste | Calculado. Todo texto da paleta passa de 5,5:1 (o menor é o branco da T10, com 5,6:1), e as bordas passam de 5:1 |
| Toque mínimo de 48 × 48 | Definido nos componentes. Botões da pessoa com 60 e "Abrir catraca" com 100 |
| Cor nunca é a única pista | Definido. O resultado muda ícone, título e texto junto com a cor |
| Fonte a 200% | Pendente. Conferir login, leitor e resultado |
| Teste com pessoas idosas | Pendente para o lote 4 (18/11): duas ou três pessoas com 60 anos ou mais, com uma rodada ao ar livre por causa do tema escuro |

## Pendências e decisões em aberto

O que está marcado como **Ideia** no documento de decisões precisa do aval do grupo antes de ir para o
código.

| Item | Quem decide |
| --- | --- |
| Nome "Passe" e identidade | Grupo |
| Tema escuro como padrão e claro como opção (validar ao sol) | Grupo e teste |
| Escala compacta do administrador (abaixo dos 18 da Tabela 18) | Grupo |
| Bloco "Você pode entrar agora" na T03, calculado a partir das autorizações | Grupo |
| Regra de cor da negação: âmbar quando a própria pessoa resolve, vermelho quando depende da administração (e o terminal usar a mesma) | Grupo e Pedro |
| Animação de mola do resultado dentro da meta de 3 s | Lucas |
| Alerta de terminal offline (T14 e T17) | Grupo |
| Opção de tema em Minha conta (configuração local, fora do contrato) | Grupo |
| Textos novos, que não estão nos requisitos | Eduardo |
| Formato da chave do terminal na T22 | Eduardo |
| Coordenadas digitadas com vírgula decimal (T18 e T19) | Eduardo e Lucas |
| Como o visitante recebe a senha (hoje o administrador define) | Grupo e Eduardo |
| Raio de 100 m (máximo ou mínimo) e vínculo da tag | Professor |
| Fonte a 200% e teste com idosos (lote 4) | Rafael |

## Para implementar

Os valores estão em [tokens.md](tokens.md), e os componentes do Figma seguem os mesmos nomes. Se uma tela
pedir um campo, uma rota ou uma regra que o contrato não tem, o assunto vai para o Eduardo antes de ir
para o código.
