import { FakeAuthorizationDirectory } from './FakeAuthorizationDirectory';
import { FakeLocationDirectory } from './FakeLocationDirectory';
import { FakeUserDirectory } from './FakeUserDirectory';
import { sampleAdmin, sampleUsers } from './sampleData';

const all = { page: 1, pageSize: 100 };
const now = () => new Date(2026, 9, 20, 10, 0);

const setup = () => {
  const users = new FakeUserDirectory();
  const locations = new FakeLocationDirectory({ now });
  const directory = new FakeAuthorizationDirectory({ users, locations, now });
  const point = (nome: string) =>
    locations.listAccessPoints(all).data.find((ap) => ap.nome === nome)!;
  const user = (nome: string) => sampleUsers.find((u) => u.nome === nome)!;
  return { directory, point, user };
};

const body = (usuarioId: string, accessPointId: string) => ({
  usuarioId,
  accessPointId,
  dataInicio: '2026-10-20',
  dataFim: '2026-10-25',
  horaInicio: '08:00',
  horaFim: '18:00',
  usosPermitidos: 3,
});

const names = (directory: FakeAuthorizationDirectory, params = {}) =>
  directory.list({ ...all, ...params }).data.map(({ usuario }) => usuario.nome);

describe('FakeAuthorizationDirectory', () => {
  it('listMine devolve só as da pessoa, as que terminam primeiro no topo', () => {
    const { directory, user } = setup();

    const { data, total } = directory.listMine(user('Maria Souza').id, all);

    expect(total).toBe(2);
    expect(data.every(({ usuario }) => usuario.nome === 'Maria Souza')).toBe(true);
    expect(data.map(({ dataFim }) => dataFim)).toEqual([...data.map((a) => a.dataFim)].sort());
  });

  it('listMine filtra pela situação efetiva e pagina', () => {
    const { directory, user } = setup();
    const visitante = user('Visitante (dev)').id;

    expect(directory.listMine(visitante, { ...all, situacao: 'EXPIRADA' }).total).toBe(1);
    expect(directory.listMine(visitante, { page: 2, pageSize: 2 }).data).toHaveLength(2);
  });

  it('o visitante do seed tem exemplos das quatro situações, para ver a T04 no modo falso', () => {
    const { directory, user } = setup();

    const states = directory
      .listMine(user('Visitante (dev)').id, all)
      .data.map((a) => a.situacaoEfetiva);

    expect(new Set(states)).toEqual(new Set(['ATIVA', 'CANCELADA', 'EXPIRADA', 'ESGOTADA']));
  });

  it('começa com exemplos das quatro situações, as mais recentes primeiro', () => {
    const { directory } = setup();

    const { data, total } = directory.list(all);

    expect(total).toBe(11);
    expect(new Set(data.map((a) => a.situacaoEfetiva))).toEqual(
      new Set(['ATIVA', 'CANCELADA', 'ESGOTADA', 'EXPIRADA']),
    );
    const dates = data.map((a) => a.criadoEm);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('filtra por pessoa, local e situação efetiva, sozinhos e combinados', () => {
    const { directory, point, user } = setup();
    const maria = user('Maria Souza').id;
    const social = point('Catraca Social').id;

    expect(new Set(names(directory, { usuarioId: maria }))).toEqual(new Set(['Maria Souza']));
    expect(
      directory
        .list({ ...all, accessPointId: social })
        .data.every((a) => a.local.nome === 'Catraca Social'),
    ).toBe(true);
    expect(
      directory
        .list({ ...all, situacao: 'CANCELADA' })
        .data.every((a) => a.situacaoEfetiva === 'CANCELADA'),
    ).toBe(true);
    expect(
      names(directory, { usuarioId: maria, accessPointId: social, situacao: 'ATIVA' }),
    ).toEqual(['Maria Souza']);
    expect(names(directory, { usuarioId: maria, situacao: 'EXPIRADA' })).toEqual([]);
  });

  it('o período mantém as que se sobrepõem ao intervalo; as pontas valem', () => {
    const { directory, point, user } = setup();
    const created = directory.create(
      {
        ...body(user('Lucas Barbosa').id, point('Catraca Social').id),
        dataInicio: '2026-12-10',
        dataFim: '2026-12-20',
      },
      sampleAdmin,
    );
    const found = (dataDe?: string, dataAte?: string) =>
      directory.list({ ...all, dataDe, dataAte }).data.some((a) => a.id === created.id);

    expect(found('2026-12-20')).toBe(true);
    expect(found('2026-12-21')).toBe(false);
    expect(found(undefined, '2026-12-10')).toBe(true);
    expect(found(undefined, '2026-12-09')).toBe(false);
    expect(found('2026-12-12', '2026-12-13')).toBe(true);
  });

  it('pagina com page e pageSize', () => {
    const { directory } = setup();

    expect(directory.list({ page: 2, pageSize: 4 })).toMatchObject({
      page: 2,
      pageSize: 4,
      total: 11,
      data: Array(4).fill(expect.anything()),
    });
  });

  it('criar segue as regras do B08 e a nova vem no topo, ativa', () => {
    const { directory, point, user } = setup();

    const created = directory.create(
      body(user('Maria Souza').id, point('Catraca Social').id),
      sampleAdmin,
    );

    expect(directory.list(all).data[0]).toEqual(created);
    expect(created).toMatchObject({
      usuario: { nome: 'Maria Souza', perfil: 'CONDOMINO' },
      local: { nome: 'Catraca Social', tipo: 'CATRACA', edificio: { nome: 'Edifício Central' } },
      usosRealizados: 0,
      usosRestantes: 3,
      situacao: 'ATIVA',
      situacaoEfetiva: 'ATIVA',
      criadoPor: { id: sampleAdmin.id },
    });
  });

  it('pessoa ou local que não existe dá 404', () => {
    const { directory, point, user } = setup();

    expect(() =>
      directory.create(body('nao-existe', point('Catraca Social').id), sampleAdmin),
    ).toThrow(expect.objectContaining({ status: 404 }));
    expect(() => directory.create(body(user('Maria Souza').id, 'nao-existe'), sampleAdmin)).toThrow(
      expect.objectContaining({ status: 404 }),
    );
  });

  it('pessoa ou local inativo dá 422 no campo', () => {
    const { directory, point, user } = setup();

    expect(() =>
      directory.create(body(user('Eduarda Martins').id, point('Catraca Social').id), sampleAdmin),
    ).toThrow(
      expect.objectContaining({
        status: 422,
        details: [expect.objectContaining({ field: 'usuarioId' })],
      }),
    );
    expect(() =>
      directory.create(body(user('Maria Souza').id, point('Catraca do Anexo').id), sampleAdmin),
    ).toThrow(
      expect.objectContaining({
        status: 422,
        details: [expect.objectContaining({ field: 'accessPointId' })],
      }),
    );
  });

  it('data final no passado e horário final antes do inicial dão 422 nos campos', () => {
    const { directory, point, user } = setup();

    expect(() =>
      directory.create(
        {
          ...body(user('Maria Souza').id, point('Catraca Social').id),
          dataInicio: '2026-10-01',
          dataFim: '2026-10-19',
          horaFim: '07:00',
        },
        sampleAdmin,
      ),
    ).toThrow(
      expect.objectContaining({
        status: 422,
        details: [
          expect.objectContaining({ field: 'dataFim' }),
          expect.objectContaining({ field: 'horaFim' }),
        ],
      }),
    );
  });

  it('id que não existe dá 404', () => {
    const { directory } = setup();

    expect(() => directory.get('nao-existe')).toThrow(
      expect.objectContaining({ status: 404, code: 'NOT_FOUND' }),
    );
    expect(() => directory.cancel('nao-existe', undefined, sampleAdmin)).toThrow(
      expect.objectContaining({ status: 404 }),
    );
  });

  it('cancelar grava quem, quando e o motivo, e a situação vira CANCELADA', () => {
    const { directory, point, user } = setup();
    const { id } = directory.create(
      body(user('Maria Souza').id, point('Catraca Social').id),
      sampleAdmin,
    );

    const cancelled = directory.cancel(id, 'Pedido da moradora', sampleAdmin);

    expect(cancelled).toMatchObject({
      situacao: 'CANCELADA',
      situacaoEfetiva: 'CANCELADA',
      canceladoPor: { id: sampleAdmin.id },
      canceladoEm: now().toISOString(),
      motivoCancelamento: 'Pedido da moradora',
    });
    expect(directory.get(id)).toEqual(cancelled);
  });

  it('cancelar de novo devolve o estado atual e não muda quem cancelou nem o motivo', () => {
    const { directory, point, user } = setup();
    const { id } = directory.create(
      body(user('Maria Souza').id, point('Catraca Social').id),
      sampleAdmin,
    );
    const first = directory.cancel(id, 'Primeiro motivo', sampleAdmin);

    const second = directory.cancel(id, 'Outro motivo', { id: 'outro', nome: 'Outra pessoa' });

    expect(second).toEqual(first);
  });

  it('motivo só com espaços vira nulo', () => {
    const { directory, point, user } = setup();
    const { id } = directory.create(
      body(user('Maria Souza').id, point('Catraca Social').id),
      sampleAdmin,
    );

    expect(directory.cancel(id, '   ', sampleAdmin).motivoCancelamento).toBeNull();
  });
});
