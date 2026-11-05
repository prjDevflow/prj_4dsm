import {
  formatDateTime,
  formatIsoDate,
  formatPeriod,
  fromIsoDate,
  fromTime,
  inSaoPaulo,
  toIsoDate,
  toTime,
} from './dateValue';

describe('dateValue', () => {
  it('mostra a data do contrato (YYYY-MM-DD) como dd/MM/aaaa', () => {
    expect(formatIsoDate('2026-10-20')).toBe('20/10/2026');
    expect(formatIsoDate('2026-01-05')).toBe('05/01/2026');
  });

  it('converte o dia escolhido no seletor para YYYY-MM-DD sem mudar o dia pelo fuso', () => {
    expect(toIsoDate(new Date(2026, 9, 25, 23, 59))).toBe('2026-10-25');
    expect(toIsoDate(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });

  it('abre o seletor no dia guardado', () => {
    const date = fromIsoDate('2026-10-20');

    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 9, 20]);
  });

  it('mostra o período da lista sem o ano', () => {
    expect(formatPeriod('2026-10-20', '2026-10-25')).toBe('20/10 a 25/10');
    expect(formatPeriod('2026-01-05', '2026-01-05')).toBe('05/01 a 05/01');
  });

  it('o período que atravessa o ano leva o ano: "28/10 a 28/10" pareceria um dia só', () => {
    expect(formatPeriod('2026-10-28', '2027-10-28')).toBe('28/10/2026 a 28/10/2027');
  });

  it('mostra um instante da API (UTC) na hora de São Paulo', () => {
    expect(formatDateTime('2026-10-19T12:05:00.000Z')).toBe('19/10/2026 às 09:05');
  });

  it('perto da meia-noite UTC, o dia mostrado é o de São Paulo', () => {
    expect(formatDateTime('2026-10-20T01:30:00.000Z')).toBe('19/10/2026 às 22:30');
  });

  it('inSaoPaulo dá o dia e a hora de São Paulo, qualquer que seja o fuso do aparelho', () => {
    expect(inSaoPaulo(new Date('2026-10-21T02:59:00.000Z'))).toEqual({
      date: '2026-10-20',
      time: '23:59',
    });
    expect(inSaoPaulo(new Date('2026-10-21T03:00:00.000Z'))).toEqual({
      date: '2026-10-21',
      time: '00:00',
    });
  });

  it('converte a hora do seletor para HH:mm e de volta', () => {
    expect(toTime(new Date(2026, 9, 25, 8, 5))).toBe('08:05');

    const date = fromTime('18:30');
    expect([date.getHours(), date.getMinutes()]).toEqual([18, 30]);
  });
});
