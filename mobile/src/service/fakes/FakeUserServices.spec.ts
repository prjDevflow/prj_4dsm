import { useSessionStore } from '@/context/SessionStore';
import { ApiError } from '../ApiError';
import { FakeUserDirectory } from './FakeUserDirectory';
import {
  FakeCreateUserService,
  FakeGetUserService,
  FakeListUsersService,
  FakeUpdateUserService,
} from './FakeUserServices';
import { sampleAdmin, sampleCondomino } from './sampleData';

describe('serviços falsos de usuários', () => {
  beforeEach(() => useSessionStore.getState().signIn('fake-token-admin', sampleAdmin));

  it('compartilham o diretório: o criado aparece na lista e no detalhe', async () => {
    const directory = new FakeUserDirectory();
    const create = new FakeCreateUserService(directory);
    const list = new FakeListUsersService(directory);

    const created = await create.exec({
      nome: 'Aaron Teste',
      email: 'aaron@email.com',
      perfil: 'VISITANTE',
      senha: 'Senha-Valida-123',
    });

    expect((await list.exec({ page: 1, pageSize: 20 })).data[0]).toEqual(created);
    await expect(new FakeGetUserService(directory).exec(created.id)).resolves.toEqual(created);
    expect(create.calls).toEqual([expect.objectContaining({ email: 'aaron@email.com' })]);
  });

  it('o PATCH usa quem está logado: o administrador não desativa a si mesmo', async () => {
    const update = new FakeUpdateUserService(new FakeUserDirectory());

    await expect(update.exec(sampleAdmin.id, { ativo: false })).rejects.toMatchObject({
      code: 'AUTO_DESATIVACAO',
    });
    await expect(update.exec(sampleCondomino.id, { ativo: false })).resolves.toMatchObject({
      ativo: false,
    });
    expect(update.calls).toEqual([
      { id: sampleAdmin.id, body: { ativo: false } },
      { id: sampleCondomino.id, body: { ativo: false } },
    ]);
  });

  it('willFail faz qualquer um falhar com o erro dado', async () => {
    const list = new FakeListUsersService(new FakeUserDirectory());
    list.willFail(new ApiError(null, 'NETWORK', 'Sem conexão'));

    await expect(list.exec({ page: 1, pageSize: 20 })).rejects.toMatchObject({ code: 'NETWORK' });
    expect(list.calls).toHaveLength(1);
  });
});
