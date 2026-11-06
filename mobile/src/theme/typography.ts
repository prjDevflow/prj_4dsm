import type { TextStyle } from 'react-native';

// Atkinson Hyperlegible Next, loaded in src/app/_layout.tsx. Android picks the weight by family name,
// so styles set fontFamily and never fontWeight.
export const fontFamily = {
  regular: 'AtkinsonHyperlegibleNext_400Regular',
  bold: 'AtkinsonHyperlegibleNext_700Bold',
  extraBold: 'AtkinsonHyperlegibleNext_800ExtraBold',
} as const;

type Weight = keyof typeof fontFamily;

// Line height: 110% in titles and 135% in text (tokens.md).
const title = (fontSize: number): TextStyle => ({
  fontFamily: fontFamily.extraBold,
  fontSize,
  lineHeight: Math.round(fontSize * 1.1),
});

const text = (fontSize: number, weight: Weight = 'regular'): TextStyle => ({
  fontFamily: fontFamily[weight],
  fontSize,
  lineHeight: Math.round(fontSize * 1.35),
});

// Figma text styles: "Pessoa/..." (T01 to T13) and "Admin/..." (T14 to T31).
export const typography = {
  pessoaResultado: title(42),
  pessoaTitulo: title(28),
  pessoaLocal: title(30),
  pessoaDestaque: title(22),
  pessoaBotao: text(20, 'extraBold'),
  pessoaCorpoForte: text(18, 'bold'),
  pessoaCorpo: text(18),
  pessoaApoio: text(16),
  pessoaRotulo: text(18, 'extraBold'),
  adminTitulo: title(22),
  adminItem: text(16, 'extraBold'),
  adminBotao: text(16, 'extraBold'),
  adminCorpo: text(16),
  adminApoio: text(14),
  adminRotulo: text(14, 'extraBold'),
  adminLegenda: text(13),
  adminSelo: text(13, 'extraBold'),
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof typography;
