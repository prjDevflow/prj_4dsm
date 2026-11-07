import { isSystemQr } from './qr';

describe('isSystemQr', () => {
  it('aceita o exemplo do contrato', () => {
    expect(isSystemQr('ACS1:q3F8k2Zr1pLw9XbTn0YhVA')).toBe(true);
  });

  it('aceita todos os caracteres do base64url, inclusive - e _', () => {
    expect(isSystemQr('ACS1:Az09-_Az09-_Az09-_Az09')).toBe(true);
  });

  it.each([
    ['um link', 'https://exemplo.com.br/ACS1:q3F8k2Zr1pLw9XbTn0YhVA'],
    ['texto vazio', ''],
    ['outro prefixo', 'ACS2:q3F8k2Zr1pLw9XbTn0YhVA'],
    ['prefixo em minúsculas', 'acs1:q3F8k2Zr1pLw9XbTn0YhVA'],
    ['21 caracteres', 'ACS1:q3F8k2Zr1pLw9XbTn0YhV'],
    ['23 caracteres', 'ACS1:q3F8k2Zr1pLw9XbTn0YhVAx'],
    ['caractere fora do base64url', 'ACS1:q3F8k2Zr1pLw9XbTn0Yh+A'],
    ['espaço antes', ' ACS1:q3F8k2Zr1pLw9XbTn0YhVA'],
    ['quebra de linha depois', 'ACS1:q3F8k2Zr1pLw9XbTn0YhVA\n'],
  ])('recusa %s', (_, text) => {
    expect(isSystemQr(text)).toBe(false);
  });
});
