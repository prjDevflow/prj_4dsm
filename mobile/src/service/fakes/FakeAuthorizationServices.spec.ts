import { useSessionStore } from '@/context/SessionStore';
import { ApiError } from '../ApiError';
import { FakeAuthorizationDirectory } from './FakeAuthorizationDirectory';
import {
  FakeCancelAuthorizationService,
  FakeCreateAuthorizationService,
  FakeGetAuthorizationService,
  FakeListAuthorizationsService,
  FakeListMyAuthorizationsService,
} from './FakeAuthorizationServices';
import { FakeLocationDirectory } from './FakeLocationDirectory';
import { FakeUserDirectory } from './FakeUserDirectory';
import { sampleAdmin, sampleUsers, sampleVisitante } from './sampleData';

const all = { page: 1, pageSize: 100 };
const now = () => new Date(2026, 9, 20, 10, 0);

const setup = () => {
  const users = new FakeUserDirectory();
  const locations = new FakeLocationDirectory({ now });
  const directory = new FakeAuthorizationDirectory({ users, locations, now });
  const point = locations.listAccessPoints(all).data.find((ap) => ap.nome === 'Catraca Social')!;
  const maria = sampleUsers.find((u) => u.nome === 'Maria Souza')!;
  const body = {
    usuarioId: maria.id,
    accessPointId: point.id,
    dataInicio: '2026-10-20',
    dataFim: '2026-10-25',
    horaInicio: '08:00',
    horaFim: '18:00',
    usosPermitidos: 3,
  };
  return { directory, body };
};

describe('serviços falsos de autorizações', () => {
  beforeEach(() => useSessionStore.getState().signIn('fake-token-admin', sampleAdmin));

  it('"minhas autorizações" são as de quem está logado, como no servidor', async () => {
    const { directory } = setup();
    const mine = new FakeListMyAuthorizationsService(directory);
    useSessionStore.getState().signIn('fake-token-visitante', sampleVisitante);

    const { data } = await mine.exec(all);

    expect(data.length).toBeGreaterThan(0);
    expect(data.every(({ usuario }) => usuario.id === sampleVisitante.id)).toBe(true);
    expect(mine.calls).toEqual([all]);
  });

  it('compartilham o diretório: a criada aparece na lista e no detalhe, feita por quem está logado', async () => {
    const { directory, body } = setup();
    const create = new FakeCreateAuthorizationService(directory);

    const created = await create.exec(body);

    expect(created.criadoPor).toMatchObject({ id: sampleAdmin.id });
    expect((await new FakeListAuthorizationsService(directory).exec(all)).data[0]).toEqual(created);
    await expect(new FakeGetAuthorizationService(directory).exec(created.id)).resolves.toEqual(
      created,
    );
    expect(create.calls).toEqual([body]);
  });

  it('cancelar usa quem está logado e guarda a chamada', async () => {
    const { directory, body } = setup();
    const { id } = await new FakeCreateAuthorizationService(directory).exec(body);
    const cancel = new FakeCancelAuthorizationService(directory);

    const cancelled = await cancel.exec(id, 'Pedido da moradora');

    expect(cancelled.canceladoPor).toMatchObject({ id: sampleAdmin.id });
    expect(cancel.calls).toEqual([{ id, motivo: 'Pedido da moradora' }]);
  });

  it('willFail faz qualquer um falhar com o erro dado, e null volta ao normal', async () => {
    const { directory } = setup();
    const list = new FakeListAuthorizationsService(directory);
    list.willFail(new ApiError(null, 'NETWORK', 'Sem conexão'));

    await expect(list.exec(all)).rejects.toMatchObject({ code: 'NETWORK' });

    list.willFail(null);
    await expect(list.exec(all)).resolves.toMatchObject({ total: 6 });
  });
});
