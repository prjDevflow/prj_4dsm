import { nextSevenDays, onlyToday } from './period';

describe('atalhos de período', () => {
  // 23:30 in São Paulo is already the next day in UTC: the dates follow the phone's local day.
  const lateEvening = new Date(2026, 9, 20, 23, 30);

  it('"Só hoje": as duas datas são hoje', () => {
    expect(onlyToday(lateEvening)).toEqual({ dataInicio: '2026-10-20', dataFim: '2026-10-20' });
  });

  it('"Próximos 7 dias": de hoje até 6 dias depois (7 dias contando hoje)', () => {
    expect(nextSevenDays(lateEvening)).toEqual({
      dataInicio: '2026-10-20',
      dataFim: '2026-10-26',
    });
  });

  it('atravessa o fim do mês e do ano', () => {
    expect(nextSevenDays(new Date(2026, 11, 28, 9, 0))).toEqual({
      dataInicio: '2026-12-28',
      dataFim: '2027-01-03',
    });
  });
});
