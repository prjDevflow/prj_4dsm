import { useSessionStore } from '@/context/SessionStore';
import { FakeCreateAuthorizationService } from './FakeAuthorizationServices';
import { FakeLocationDirectory } from './FakeLocationDirectory';
import { FakeUserDirectory } from './FakeUserDirectory';
import { sampleAdmin, sampleUsers } from './sampleData';

const all = { page: 1, pageSize: 100 };
const now = () => new Date(2026, 9, 20, 10, 0);

const setup = () => {
  const users = new FakeUserDirectory();
  const locations = new FakeLocationDirectory({ now });
  const service = new FakeCreateAuthorizationService({ users, locations, now });
  const point = (nome: string) =>
    locations.listAccessPoints(all).data.find((ap) => ap.nome === nome)!;
  const user = (nome: string) => sampleUsers.find((u) => u.nome === nome)!;
  return { service, point, user };
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

describe('FakeCreateAuthorizationService', () => {
  beforeEach(() => useSessionStore.getState().signIn('fake-token-admin', sampleAdmin));

  it('cria ativa, com os nomes da pessoa, do local e do edifício e quem criou', async () => {
    const { service, point, user } = setup();

    const created = await service.exec(body(user('Maria Souza').id, point('Catraca Social').id));

    expect(created).toMatchObject({
      usuario: { nome: 'Maria Souza', perfil: 'CONDOMINO' },
      local: { nome: 'Catraca Social', tipo: 'CATRACA', edificio: { nome: 'Edifício Central' } },
      usosPermitidos: 3,
      usosRealizados: 0,
      usosRestantes: 3,
      situacao: 'ATIVA',
      situacaoEfetiva: 'ATIVA',
      criadoPor: { id: sampleAdmin.id },
    });
    expect(service.calls).toHaveLength(1);
  });

  it('pessoa ou local que não existe dá 404', async () => {
    const { service, point, user } = setup();

    await expect(
      service.exec(body('nao-existe', point('Catraca Social').id)),
    ).rejects.toMatchObject({
      status: 404,
    });
    await expect(service.exec(body(user('Maria Souza').id, 'nao-existe'))).rejects.toMatchObject({
      status: 404,
    });
  });

  it('pessoa ou local inativo dá 422 no campo', async () => {
    const { service, point, user } = setup();

    await expect(
      service.exec(body(user('Eduarda Martins').id, point('Catraca Social').id)),
    ).rejects.toMatchObject({
      status: 422,
      details: [expect.objectContaining({ field: 'usuarioId' })],
    });
    await expect(
      service.exec(body(user('Maria Souza').id, point('Catraca do Anexo').id)),
    ).rejects.toMatchObject({
      status: 422,
      details: [expect.objectContaining({ field: 'accessPointId' })],
    });
  });

  it('data final no passado e horário final antes do inicial dão 422 nos campos', async () => {
    const { service, point, user } = setup();

    await expect(
      service.exec({
        ...body(user('Maria Souza').id, point('Catraca Social').id),
        dataInicio: '2026-10-01',
        dataFim: '2026-10-19',
        horaFim: '07:00',
      }),
    ).rejects.toMatchObject({
      status: 422,
      details: [
        expect.objectContaining({ field: 'dataFim' }),
        expect.objectContaining({ field: 'horaFim' }),
      ],
    });
  });
});
