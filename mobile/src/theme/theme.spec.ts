import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { colors } from './colors';
import { contrastRatio } from './contrast';
import { radius, sizes } from './radius';
import { screenMargin, spacing } from './spacing';
import { fontFamily, typography } from './typography';

const TOKENS_PATH = resolve(__dirname, '../../../docs/app-mobile/design/tokens.md');

// "superficie/alta" → "superficieAlta", "area/usuarios/sobre" → "areaUsuariosSobre"
const toCamelCase = (token: string) =>
  token.replace(/\/(\w)/g, (_, letter: string) => letter.toUpperCase());

const readColorTokens = () =>
  [...readFileSync(TOKENS_PATH, 'utf8').matchAll(/^\| `([\w/]+)` \| `(#[0-9A-F]{6})` \|/gm)].map(
    ([, token, hex]) => ({ token, name: toCamelCase(token), hex }),
  );

describe('tema', () => {
  it('tem todas as cores do tokens.md, com os mesmos nomes em camelCase', () => {
    const tokens = readColorTokens();

    expect(tokens.length).toBeGreaterThanOrEqual(40);
    for (const { name, hex } of tokens) {
      expect({ name, hex: colors[name as keyof typeof colors] }).toEqual({ name, hex });
    }
  });

  it('usa a escala da pessoa (corpo 18, botão 20) e a do administrador (corpo 16, botão 16)', () => {
    expect(typography.pessoaCorpo).toMatchObject({ fontSize: 18, fontFamily: fontFamily.regular });
    expect(typography.pessoaBotao).toMatchObject({
      fontSize: 20,
      fontFamily: fontFamily.extraBold,
    });
    expect(typography.pessoaResultado).toMatchObject({ fontSize: 42 });
    expect(typography.adminCorpo).toMatchObject({ fontSize: 16, fontFamily: fontFamily.regular });
    expect(typography.adminBotao).toMatchObject({ fontSize: 16, fontFamily: fontFamily.extraBold });
    expect(typography.adminSelo).toMatchObject({ fontSize: 13, fontFamily: fontFamily.extraBold });
  });

  it('usa entrelinha de 110% nos títulos e 135% no texto', () => {
    expect(typography.pessoaResultado.lineHeight).toBe(Math.round(42 * 1.1));
    expect(typography.adminTitulo.lineHeight).toBe(Math.round(22 * 1.1));
    expect(typography.pessoaCorpo.lineHeight).toBe(Math.round(18 * 1.35));
    expect(typography.adminApoio.lineHeight).toBe(Math.round(14 * 1.35));
  });

  it('tem o espaçamento de 4 a 32, margem lateral de 16 e toque mínimo de 48', () => {
    expect(Object.values(spacing)).toEqual([4, 8, 12, 16, 24, 32]);
    expect(screenMargin).toBe(16);
    expect(sizes).toMatchObject({ touchMin: 48, buttonPessoa: 60, buttonAdmin: 48, field: 52 });
    expect(radius).toMatchObject({ campo: 12, selo: 8, fab: 16, cartao: 20, dialogo: 28 });
  });

  it('calcula o contraste como o WCAG (preto no branco = 21:1)', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
    expect(contrastRatio(colors.texto, colors.fundo)).toBeCloseTo(14.3, 0);
  });

  it.each([
    ['texto no fundo', colors.texto, colors.fundo],
    ['texto de apoio na superfície alta', colors.textoApoio, colors.superficieAlta],
    ['botão principal', colors.primariaSobre, colors.primaria],
    ['botão tonal', colors.primariaContainerSobre, colors.primariaContainer],
    ['botão de contorno e texto', colors.primaria, colors.fundo],
    ['botão perigo', colors.erroSobre, colors.erro],
    ['botão perigo contorno', colors.erro, colors.fundo],
    ['botão catraca', colors.acaoSobre, colors.acao],
    ['selo sucesso', colors.sucessoContainerSobre, colors.sucessoContainer],
    ['selo erro', colors.erroContainerSobre, colors.erroContainer],
    ['selo neutro', colors.textoApoio, colors.superficieMaxima],
    ['selo aviso e faixa sem internet', colors.acaoSobre, colors.aviso],
    ['selo primário e alerta de sessão', colors.primariaContainerSobre, colors.primariaContainer],
    ['aviso curto', colors.inversoSobre, colors.inverso],
    ['erro de campo', colors.erro, colors.fundo],
    ['resultado autorizado', colors.branco, colors.resultadoAutorizado],
    ['resultado negado', colors.branco, colors.resultadoNegado],
    ['resultado tente de novo', colors.acaoSobre, colors.resultadoTente],
    ['texto de exemplo (placeholder) do campo', colors.contorno, colors.fundo],
    ['"Voltar" do diálogo', colors.primaria, colors.superficieAlta],
    [
      'texto de apoio do cartão de destaque',
      colors.primariaContainerApoio,
      colors.primariaContainer,
    ],
  ])('o par "%s" passa de 4,5:1 (WCAG AA)', (_, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['borda do campo', colors.contorno, colors.fundo],
    ['borda do campo em foco', colors.primaria, colors.fundo],
    ['borda do campo com erro', colors.erro, colors.fundo],
    ['bolinha do interruptor desligado', colors.contorno, colors.superficieMaxima],
    ['bolinha do interruptor ligado', colors.primariaSobre, colors.primaria],
    ['ícone da linha de navegação', colors.primaria, colors.superficieAlta],
    ['parte cheia da barra de progresso', colors.primaria, colors.superficieMaxima],
  ])('o elemento "%s" passa de 3:1 (WCAG, partes que não são texto)', (_, part, background) => {
    expect(contrastRatio(part, background)).toBeGreaterThanOrEqual(3);
  });
});
