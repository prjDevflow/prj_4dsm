import { buildSummary } from './authorizationForm.summary';

const names = { pessoa: 'Maria Souza', local: 'Catraca Social', edificio: 'Edifício Central' };

const body = {
  usuarioId: 'u-1',
  accessPointId: 'ap-1',
  dataInicio: '2026-10-20',
  dataFim: '2026-10-25',
  horaInicio: '08:00',
  horaFim: '18:00',
  usosPermitidos: 3,
};

describe('buildSummary', () => {
  it('descreve em linguagem simples exatamente o que vai para a API', () => {
    expect(buildSummary(body, names)).toBe(
      'Maria Souza poderá entrar em Catraca Social (Edifício Central) de 20/10/2026 a 25/10/2026, das 08:00 às 18:00, até 3 vezes.',
    );
  });

  it('uma utilização é "1 vez"', () => {
    expect(buildSummary({ ...body, usosPermitidos: 1 }, names)).toMatch(/até 1 vez\.$/);
  });

  it('um dia só vira "no dia"', () => {
    expect(buildSummary({ ...body, dataFim: '2026-10-20' }, names)).toBe(
      'Maria Souza poderá entrar em Catraca Social (Edifício Central) no dia 20/10/2026, das 08:00 às 18:00, até 3 vezes.',
    );
  });

  it('mil utilizações aparecem com o ponto de milhar', () => {
    expect(buildSummary({ ...body, usosPermitidos: 1000 }, names)).toMatch(/até 1\.000 vezes\.$/);
  });
});
