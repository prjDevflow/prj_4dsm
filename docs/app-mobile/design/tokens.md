# Tokens e componentes do app mobile (Passe)

Valores do Figma para implementar o app. No Figma, as cores são variáveis da coleção "Passe", modo
"Escuro", e os estilos de texto têm os nomes da seção [Tipografia](#tipografia). O porquê de cada escolha
está em [passe-decisoes-de-design.pdf](passe-decisoes-de-design.pdf).

## Cores (tema escuro)

| Token | Hex | Uso |
| --- | --- | --- |
| `fundo` | `#121318` | Chão de todas as telas (não usar preto puro) |
| `superficie/baixa` | `#1A1B21` | Cartões discretos, painéis de estado |
| `superficie` | `#1E1F25` | Cartões |
| `superficie/alta` | `#292A2F` | Linhas de navegação, busca, diálogos |
| `superficie/maxima` | `#34343A` | Trilhos de progresso, selo neutro, interruptor desligado |
| `texto` | `#E3E1E9` | Texto principal (14,3:1 no fundo) |
| `texto/apoio` | `#C6C5D0` | Texto secundário (10,9:1) |
| `contorno` | `#90909A` | Bordas de campos, botão de contorno |
| `contorno/suave` | `#45464F` | Divisores |
| `primaria` | `#B5C4FF` | Botão principal, links, logo |
| `primaria/sobre` | `#0F2B76` | Texto e ícone sobre a primária (7,6:1) |
| `primaria/container` | `#2A4494` | Cartão do início, destaque |
| `primaria/container/sobre` | `#DCE1FF` | Texto sobre o container (6,9:1) |
| `primaria/container/apoio` | `#C3CCF5` | Texto secundário sobre o container |
| `primaria/container/linha` | `#4660B0` | Linhas e trilho dentro do container |
| `acao` | `#FFD95C` | "Abrir catraca" (só essa ação) |
| `acao/sobre` | `#231B00` | Texto sobre amarelo (12,5:1) |
| `aviso` | `#FFE08A` | Sem internet, terminal offline, fora do horário |
| `sucesso` | `#8BD8A2` | Selo autorizado no histórico |
| `sucesso/sobre` | `#00391C` | Ícone sobre o selo de sucesso |
| `sucesso/container` | `#0F5530` | Fundo do selo "Ativa" e do chip "Você pode entrar agora" |
| `sucesso/container/sobre` | `#B8F0C6` | Texto sobre o container de sucesso |
| `erro` | `#FFB4AB` | Selo negado, perigo, texto de erro |
| `erro/sobre` | `#690005` | Texto sobre o erro |
| `erro/container` | `#93000A` | Fundo do selo "Cancelada" |
| `erro/container/sobre` | `#FFDAD6` | Texto sobre o container de erro |
| `inverso` | `#E3E1E9` | Aviso curto (snackbar) |
| `inverso/sobre` | `#2F3036` | Texto do aviso curto |
| `resultado/autorizado` | `#17773F` | Tela T10 (branco sobre ela: 5,6:1) |
| `resultado/negado` | `#C1272D` | T11 vermelha (branco sobre ela: 5,8:1) |
| `resultado/tente` | `#F5C518` | T11 âmbar (texto `#231B00` sobre ela: 10,5:1) |
| `branco` | `#FFFFFF` | Texto e selo nas telas de resultado |
| `area/usuarios` | `#3E4359` | Bloco Usuários |
| `area/usuarios/sobre` | `#DEE1F9` | Forma e texto do bloco Usuários |
| `area/locais` | `#2F4A38` | Bloco Locais e terminais |
| `area/locais/sobre` | `#D3E8D9` | Forma e texto do bloco Locais |
| `area/tags` | `#6F3B0E` | Bloco Tags NFC |
| `area/tags/sobre` | `#FFDCC2` | Forma e texto do bloco Tags |
| `area/historico` | `#4F378B` | Bloco Histórico |
| `area/historico/sobre` | `#E9DDFF` | Forma e texto do bloco Histórico |

Valores soltos:

- **Fundo do leitor de QR Code:** `#0D0F14`.
- **Linhas finas da T10:** `#5FA97D`.
- **Linhas finas da T11 âmbar:** `#B8951C`.
- **Linhas finas da T11 vermelha:** `#DA7378`.

O tema claro ainda não tem valores próprios. Até lá, use o esquema claro equivalente do Material 3.

## Resultado negado (T11)

O texto de cada motivo é o `message` do contrato ([seção 4.4](../../../backend/docs/ai/03-domain-and-contract.md#44-códigos-de-negação-e-mensagens-campo-message-do-app)),
igual palavra por palavra ao que está no Figma. O código nunca aparece na tela.

O tom depende de quem resolve o problema:

- **Âmbar:** a própria pessoa resolve.
- **Vermelho:** depende da administração ou de outra data.

A cor nunca muda sozinha: o título, o ícone e o texto mudam junto.

| Código | Ícone no selo | Tom | Botão principal |
| --- | --- | --- | --- |
| `CREDENCIAL_INVALIDA` | `qr_code_2` | Âmbar | Ler outro QR Code |
| `CREDENCIAL_EXPIRADA` | `timer_off` | Âmbar | Ler outro QR Code |
| `CREDENCIAL_REUTILIZADA` | `restart_alt` | Âmbar | Ler outro QR Code |
| `DISTANTE_DO_TERMINAL` | `wrong_location` | Âmbar | Tentar de novo |
| `LOCALIZACAO_INVALIDA` | `location_off` | Âmbar | Tentar de novo |
| `SEM_AUTORIZACAO` | `block` | Vermelho | Ver minhas autorizações |
| `AUTORIZACAO_CANCELADA` | `cancel` | Vermelho | Ver minhas autorizações |
| `FORA_DO_PERIODO` | `event_busy` | Vermelho | Ver minhas autorizações |
| `USOS_ESGOTADOS` | `remove_circle` | Vermelho | Ver minhas autorizações |
| `USUARIO_INATIVO` | `person_off` | Vermelho | Ver minhas autorizações |

O botão secundário é sempre "Voltar ao início", em contorno.

Dois erros não são negação e também usam o botão "Ler outro QR Code":

- **Sem internet:** "Sem conexão. Verifique sua internet e leia o QR Code de novo."
- **Erro do servidor:** "Não foi possível validar agora. Tente de novo em instantes."

## Tipografia

A fonte é a **Atkinson Hyperlegible Next** (Google Fonts), nos pesos 400, 700 e 800. Ela foi criada pelo
Braille Institute para pessoas com baixa visão e diferencia I, l, 1, 0 e O.

| Uso | Pessoa (T01 a T13) | Administrador (T14 a T31) |
| --- | --- | --- |
| Título do resultado | 42 / 800 | – |
| Título de tela | 26 a 32 / 800 | 22 a 24 / 800 |
| Nome do local no cartão | 30 a 32 / 800 | – |
| Destaque | 22 / 800 | 16 / 800 (item de lista) |
| Corpo | 18 / 400 | 16 / 400 |
| Apoio | 16 / 400 | 14 / 400 |
| Rótulo de campo | 18 / 800 | 14 / 800 |
| Botão | 20 / 800 | 16 / 800 |
| Selo | – | 13 / 800 |

- **Entrelinha:** 110% nos títulos e 135% no texto.
- **Fonte do sistema a 200%:** o layout precisa aguentar sem cortar texto.
- **Estilos no Figma:** `Pessoa/Resultado`, `Pessoa/Título`, `Pessoa/Destaque`, `Pessoa/Botão`,
  `Pessoa/Corpo forte`, `Pessoa/Corpo`, `Pessoa/Apoio`, `Admin/Título`, `Admin/Item`, `Admin/Corpo`,
  `Admin/Apoio`, `Admin/Rótulo`, `Admin/Legenda` e `Admin/Selo`.

## Cantos, espaçamento e toque

| Medida | Valor |
| --- | --- |
| Cantos | 28 em cartões grandes e no "Abrir catraca" do início; 20 a 24 em cartões comuns e blocos do administrador; 16 no botão flutuante e nos alertas; 12 nos campos; 8 nos filtros e selos |
| Botões | Em pílula, com raio igual à metade da altura |
| Espaçamento | Escala de 4, 8, 12, 16, 24 e 32, com margem lateral de 16 |
| Toque mínimo | 48 × 48 em todo o app |
| Altura dos botões | 60 na pessoa e 48 no administrador. "Abrir catraca" tem 100 no início e 72 no rodapé |
| Frame | 390 × 844, em retrato |

## Formas

| Forma | Onde aparece |
| --- | --- |
| Cookie de 12 lados | Selo, logo, resultado, histórico e autorizações |
| Trevo de 4 folhas | Usuários |
| Arco | Locais e terminais |
| Sol de 8 pontas | Tags NFC |
| Círculo | Histórico |

No Android com Compose, elas existem prontas em `MaterialShapes` (`Cookie12Sided`, `Clover4Leaf`, `Arch`,
`Sunny`, `Circle`). Em React Native, desenhe com `react-native-svg` usando estes caminhos (viewBox
`0 0 100 100`):

```text
Cookie12: r(θ) = 50 × (0,93 + 0,07 × cos 12θ), centro (50,50)
Sol8:     r(θ) = 50 × (0,90 + 0,10 × cos 8θ)
Trevo4:   r(θ) = 50 × (0,74 + 0,26 × cos 4θ), girado 45°
Arco:     M14 92V50a36 36 0 0 1 72 0v42a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z
Círculo:  M50 2a48 48 0 1 1 0 96a48 48 0 0 1 0-96z
```

Caminho pronto do cookie, com 96 pontos:

```text
M100.0 50.0 L98.9 53.2 L96.1 56.1 L93.2 58.6 L91.5 61.1 L91.7 64.2 L93.0 67.8 L93.9 71.7 L93.3 75.0 L90.7 77.2 L86.9 78.3 L83.1 79.0 L80.4 80.4 L79.0 83.1 L78.3 86.9 L77.2 90.7 L75.0 93.3 L71.7 93.9 L67.8 93.0 L64.2 91.7 L61.1 91.5 L58.6 93.2 L56.1 96.1 L53.2 98.9 L50.0 100.0 L46.8 98.9 L43.9 96.1 L41.4 93.2 L38.9 91.5 L35.8 91.7 L32.2 93.0 L28.3 93.9 L25.0 93.3 L22.8 90.7 L21.7 86.9 L21.0 83.1 L19.6 80.4 L16.9 79.0 L13.1 78.3 L9.3 77.2 L6.7 75.0 L6.1 71.7 L7.0 67.8 L8.3 64.2 L8.5 61.1 L6.8 58.6 L3.9 56.1 L1.1 53.2 L0.0 50.0 L1.1 46.8 L3.9 43.9 L6.8 41.4 L8.5 38.9 L8.3 35.8 L7.0 32.2 L6.1 28.3 L6.7 25.0 L9.3 22.8 L13.1 21.7 L16.9 21.0 L19.6 19.6 L21.0 16.9 L21.7 13.1 L22.8 9.3 L25.0 6.7 L28.3 6.1 L32.2 7.0 L35.8 8.3 L38.9 8.5 L41.4 6.8 L43.9 3.9 L46.8 1.1 L50.0 0.0 L53.2 1.1 L56.1 3.9 L58.6 6.8 L61.1 8.5 L64.2 8.3 L67.8 7.0 L71.7 6.1 L75.0 6.7 L77.2 9.3 L78.3 13.1 L79.0 16.9 L80.4 19.6 L83.1 21.0 L86.9 21.7 L90.7 22.8 L93.3 25.0 L93.9 28.3 L93.0 32.2 L91.7 35.8 L91.5 38.9 L93.2 41.4 L96.1 43.9 L98.9 46.8 Z
```

## Ícones

A família é a **Material Symbols Rounded**, preenchida, com peso 500. Nenhum ícone aparece sozinho, e todo
botão só com ícone tem rótulo de acessibilidade.

| Grupo | Ícones |
| --- | --- |
| Navegação e ações | `qr_code_scanner`, `arrow_back`, `chevron_right`, `expand_more`, `logout`, `add`, `add_link`, `add_business`, `person_add`, `edit`, `search`, `arrow_drop_down`, `content_copy`, `refresh`, `key`, `my_location` |
| Autorizações e histórico | `confirmation_number`, `history`, `calendar_month`, `schedule` |
| Estados e sistema | `check`, `check_circle`, `close`, `wifi_off`, `warning`, `info`, `dark_mode`, `lock_clock`, `hourglass_disabled`, `search_off`, `error`, `progress_activity` |
| Câmera e localização | `photo_camera`, `no_photography`, `location_on`, `location_off`, `flashlight_on`, `flashlight_off` |
| Áreas e locais | `group`, `apartment`, `nfc`, `contactless`, `tablet_android`, `support_agent`, `login`, `door_front` |

Os ícones de cada motivo de negação estão na tabela da [T11](#resultado-negado-t11).

## Movimento

| Momento | Comportamento |
| --- | --- |
| Resultado (T10 e T11) | O selo entra com mola (escala 0,55 → 1,08 → 0,97 → 1, com giro leve) em cerca de 0,6 s, e o texto aparece em 0,3 s |
| Carregando | O selo cookie gira ou pulsa no lugar do indicador circular (T01, "Entrando…" da T02, T09 e T31) |
| Animação reduzida | Se o sistema pedir, tudo abre pronto, sem animação |
| Vibração e leitor de tela | Disparam no instante em que a resposta chega, sem esperar a animação. O resultado é anunciado como alerta |

A meta é levar menos de 3 s entre ler o QR Code e mostrar o resultado. Se a animação ameaçar essa meta,
ela sai e fica só a cor. Do início até a catraca são no máximo 3 toques.

## Componentes

| Componente | Variantes | Propriedades |
| --- | --- | --- |
| Forma | Cookie, Trevo, Arco, Sol e Círculo (100 × 100, com cor sobrescrevível) | – |
| Botão | Tipo (Principal, Tonal, Contorno, Texto, Perigo, Perigo contorno, Catraca) × Tamanho (Pessoa 60, Admin 48) | Rótulo |
| Selo de situação | Sucesso, Erro, Neutro, Aviso e Primário (26 de altura) | Texto |
| Filtro | Selecionado (com check) e Padrão (contorno) | Texto |
| Campo | Normal, Erro e Somente leitura (358 de largura, caixa de 52) | Rótulo, Valor, Ajuda, Mostrar ajuda |

Cores de cada tipo de botão:

| Tipo | Fundo | Texto | Borda |
| --- | --- | --- | --- |
| Principal | `primaria` | `primaria/sobre` | – |
| Tonal | `primaria/container` | `primaria/container/sobre` | – |
| Contorno | – | `primaria` | `contorno` |
| Texto | – | `primaria` | – |
| Perigo | `erro` | `erro/sobre` | – |
| Perigo contorno | – | `erro` | `erro` |
| Catraca | `acao` | `acao/sobre` | – |

Padrões montados direto nas telas:

| Padrão | Medidas |
| --- | --- |
| Linha de navegação | `superficie/alta`, raio 20, 64 de altura, com ícone primário, texto, contador e chevron |
| Barra de progresso | Dois retângulos de 8 de altura e raio 4, na proporção entre entradas restantes e o total |
| Botão flutuante | `primaria/container`, raio 16, 56 de altura, no canto inferior direito. Na T14 ele é amarelo e diz "Abrir catraca" |
| Interruptor | Padrão do M3, 52 × 32 |
| Diálogo | `superficie/alta`, raio 28 |
| Aviso curto | `inverso`, raio 8, por cerca de 3 s |
| Busca | Pílula `superficie/alta` com 52 de altura |
| Segmentado | Usado no tipo de local (T19) |

## Bibliotecas sugeridas

Esta lista é só uma sugestão do design e ainda precisa ser validada pelo Lucas.

| Para quê | Sugestão |
| --- | --- |
| Botões, campos, filtros, interruptores, diálogos e aviso curto | `react-native-paper`, com o tema MD3 |
| Formas | `react-native-svg` |
| Leitura do QR Code | `expo-camera` |
| Localização | `expo-location` |
| Vibração | `expo-haptics` |
| Token da sessão | `expo-secure-store` |
| Fonte | `expo-font` |
| Ícones | A definir: o `@expo/vector-icons` traz os Material Icons antigos, não os Material Symbols |
