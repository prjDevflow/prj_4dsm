import { isAllowedNow } from './allowedNow';

const window = {
  dataInicio: '2026-10-20',
  dataFim: '2026-10-25',
  horaInicio: '08:00',
  horaFim: '18:00',
};

// 11:00 UTC is 08:00 in São Paulo.
const at = (utc: string) => new Date(`${utc}:00.000Z`);

describe('isAllowedNow', () => {
  it.each([
    ['antes da janela', '2026-10-21T10:59', false],
    ['no primeiro minuto', '2026-10-21T11:00', true],
    ['dentro da janela', '2026-10-21T15:00', true],
    ['no último minuto', '2026-10-21T21:00', true],
    ['depois da janela', '2026-10-21T21:01', false],
  ])('%s', (_, instant, expected) => {
    expect(isAllowedNow(window, at(instant))).toBe(expected);
  });

  it('o primeiro e o último dia do período contam', () => {
    expect(isAllowedNow(window, at('2026-10-20T15:00'))).toBe(true);
    expect(isAllowedNow(window, at('2026-10-25T15:00'))).toBe(true);
  });

  it('antes do primeiro dia ou depois do último não pode entrar, mesmo na hora certa', () => {
    expect(isAllowedNow(window, at('2026-10-19T15:00'))).toBe(false);
    expect(isAllowedNow(window, at('2026-10-26T15:00'))).toBe(false);
  });

  it('usa o dia de São Paulo: 01:00 UTC do dia 26 ainda é dia 25 lá', () => {
    expect(isAllowedNow({ ...window, horaFim: '23:00' }, at('2026-10-26T01:00'))).toBe(true);
  });
});
