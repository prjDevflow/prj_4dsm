import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { FakeHashProvider } from '../../../../test/doubles/FakeHashProvider';
import { InMemoryUserRepository } from '../../../../test/doubles/InMemoryUserRepository';
import { makeUser } from '../../../../test/factories/makeUser';
import { UpdateUserUseCase } from './UpdateUser_UseCase';

const ADMIN_ID = '00000000-0000-4000-8000-0000000000a1';
const OTHER_ADMIN_ID = '00000000-0000-4000-8000-0000000000a2';
const TARGET_ID = '00000000-0000-4000-8000-0000000000b1';

const makeSut = async () => {
  const users = new InMemoryUserRepository();
  const hash = new FakeHashProvider();
  const clock = new FakeClock(new Date('2026-10-21T10:00:00Z'));
  await users.save(makeUser({ id: ADMIN_ID, nome: 'Admin Um', email: 'a1@t.local', perfil: 'ADMIN' }));
  await users.save(
    makeUser({
      id: TARGET_ID,
      nome: 'Maria Souza',
      email: 'maria@t.local',
      perfil: 'VISITANTE',
      senhaHash: await hash.hash('Senha-Antiga-1'),
    }),
  );
  const sut = new UpdateUserUseCase(users, hash, clock);
  return { sut, users, hash, clock };
};

describe('UpdateUser', () => {
  it('deve atualizar nome, perfil e ativo e renovar atualizadoEm', async () => {
    const { sut, users, clock } = await makeSut();

    const result = await sut.execute(
      TARGET_ID,
      { nome: 'Maria de Souza', perfil: 'CONDOMINO', ativo: false },
      ADMIN_ID,
    );

    const saved = await users.findById(TARGET_ID);
    expect(result).toMatchObject({ nome: 'Maria de Souza', perfil: 'CONDOMINO', ativo: false });
    expect(saved).toMatchObject({ nome: 'Maria de Souza', perfil: 'CONDOMINO', ativo: false });
    expect(saved?.atualizadoEm).toEqual(clock.now());
  });

  it.todo('deve guardar a nova senha como hash e manter o resto');
  it.todo('deve reativar um usuário inativo');
  it.todo('deve devolver o usuário sem o senhaHash');
  it.todo('deve lançar NotFoundError quando o usuário não existe, antes de qualquer regra de conflito');
  it.todo('deve negar AUTO_DESATIVACAO quando o administrador se desativa');
  it.todo('deve negar AUTO_DESATIVACAO quando o administrador rebaixa o próprio perfil');
  it.todo('deve permitir ao administrador alterar o próprio nome e a própria senha');
  it.todo('deve permitir desativar ou rebaixar outro administrador quando sobra um ativo');
  it.todo('deve negar ULTIMO_ADMIN ao desativar ou rebaixar o único administrador ativo');
});
