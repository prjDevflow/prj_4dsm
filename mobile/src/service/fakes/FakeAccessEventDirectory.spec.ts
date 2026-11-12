import { FakeAccessEventDirectory, sampleAccessEvents } from './FakeAccessEventDirectory';
import { sampleCondomino, sampleVisitante } from './sampleData';

const NOW = new Date('2026-10-24T18:00:00Z');

describe('FakeAccessEventDirectory', () => {
  const directory = () => new FakeAccessEventDirectory(sampleAccessEvents(NOW));

  it('lista do mais recente para o mais antigo e pagina', () => {
    const first = directory().list({ page: 1, pageSize: 3 });
    const second = directory().list({ page: 2, pageSize: 3 });

    expect(first.total).toBe(sampleAccessEvents(NOW).length);
    const instants = [...first.data, ...second.data].map((event) => event.ocorridoEm);
    expect(instants).toEqual([...instants].sort().reverse());
    expect(first.data[0].id).not.toBe(second.data[0].id);
  });

  it('tem tentativas aprovadas, negadas e uma sem pessoa identificada', () => {
    const events = sampleAccessEvents(NOW);

    expect(events.some((event) => event.resultado === 'AUTORIZADO')).toBe(true);
    expect(events.some((event) => event.resultado === 'NEGADO')).toBe(true);
    expect(events.some((event) => event.usuario === null)).toBe(true);
  });

  it('combina os filtros', () => {
    const { data } = directory().list({
      usuarioId: sampleVisitante.id,
      resultado: 'NEGADO',
      page: 1,
      pageSize: 50,
    });

    expect(data.length).toBeGreaterThan(0);
    expect(
      data.every(
        (event) => event.usuario?.id === sampleVisitante.id && event.resultado === 'NEGADO',
      ),
    ).toBe(true);
  });

  it('filtra pelo método e pelo motivo', () => {
    const { data } = directory().list({
      metodo: 'NFC',
      motivo: 'TAG_DESCONHECIDA',
      page: 1,
      pageSize: 50,
    });

    expect(data.length).toBeGreaterThan(0);
    expect(
      data.every((event) => event.metodo === 'NFC' && event.motivo === 'TAG_DESCONHECIDA'),
    ).toBe(true);
  });

  it('respeita o período, com os limites incluídos', () => {
    const all = directory().list({ page: 1, pageSize: 50 }).data;
    const newest = all[0].ocorridoEm;

    const { data } = directory().list({ de: newest, ate: newest, page: 1, pageSize: 50 });

    expect(data.map((event) => event.ocorridoEm)).toEqual([newest]);
  });

  it('as próprias tentativas são só as da pessoa', () => {
    const { data } = directory().listMine(sampleCondomino.id, { page: 1, pageSize: 50 });

    expect(data.length).toBeGreaterThan(0);
    expect(data.every((event) => event.usuario?.id === sampleCondomino.id)).toBe(true);
  });
});
