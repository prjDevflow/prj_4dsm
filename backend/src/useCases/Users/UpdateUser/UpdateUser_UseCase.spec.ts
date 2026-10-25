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
  await users.save(
    makeUser({ id: ADMIN_ID, nome: 'Admin Um', email: 'a1@t.local', perfil: 'ADMIN' }),
  );
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

  it('deve guardar a nova senha como hash e manter o resto', async () => {
    const { sut, users, hash } = await makeSut();

    await sut.execute(TARGET_ID, { senha: 'Senha-Nova-123' }, ADMIN_ID);

    const saved = await users.findById(TARGET_ID);
    expect(saved?.senhaHash).toBe(await hash.hash('Senha-Nova-123'));
    expect(saved).toMatchObject({ nome: 'Maria Souza', perfil: 'VISITANTE', ativo: true });
  });

  it('deve reativar um usuário inativo', async () => {
    const { sut, users } = await makeSut();
    await users.save(makeUser({ id: OTHER_ADMIN_ID, email: 'x@t.local', ativo: false }));

    const result = await sut.execute(OTHER_ADMIN_ID, { ativo: true }, ADMIN_ID);

    expect(result.ativo).toBe(true);
    expect((await users.findById(OTHER_ADMIN_ID))?.ativo).toBe(true);
  });

  it('deve devolver o usuário sem o senhaHash', async () => {
    const { sut } = await makeSut();

    const result = await sut.execute(TARGET_ID, { nome: 'Outro Nome' }, ADMIN_ID);

    expect(result).not.toHaveProperty('senhaHash');
  });

  it('deve lançar NotFoundError quando o usuário não existe, antes de qualquer regra de conflito', async () => {
    const { sut } = await makeSut();
    const missing = '00000000-0000-4000-8000-0000000000ff';

    const error = await sut.execute(missing, { ativo: false }, missing).catch((e) => e);

    expect(error).toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('deve negar AUTO_DESATIVACAO quando o administrador se desativa', async () => {
    const { sut, users } = await makeSut();

    const error = await sut.execute(ADMIN_ID, { ativo: false }, ADMIN_ID).catch((e) => e);

    expect(error).toMatchObject({ code: 'AUTO_DESATIVACAO', status: 409 });
    expect((await users.findById(ADMIN_ID))?.ativo).toBe(true);
  });

  it('deve negar AUTO_DESATIVACAO quando o administrador rebaixa o próprio perfil', async () => {
    const { sut, users } = await makeSut();
    await users.save(makeUser({ id: OTHER_ADMIN_ID, email: 'a2@t.local', perfil: 'ADMIN' }));

    const error = await sut.execute(ADMIN_ID, { perfil: 'CONDOMINO' }, ADMIN_ID).catch((e) => e);

    expect(error).toMatchObject({ code: 'AUTO_DESATIVACAO', status: 409 });
    expect((await users.findById(ADMIN_ID))?.perfil).toBe('ADMIN');
  });

  it('deve permitir ao administrador alterar o próprio nome e a própria senha', async () => {
    const { sut, users, hash } = await makeSut();

    await sut.execute(
      ADMIN_ID,
      { nome: 'Admin Renomeado', senha: 'Senha-Nova-123', perfil: 'ADMIN', ativo: true },
      ADMIN_ID,
    );

    const saved = await users.findById(ADMIN_ID);
    expect(saved).toMatchObject({ nome: 'Admin Renomeado', perfil: 'ADMIN', ativo: true });
    expect(saved?.senhaHash).toBe(await hash.hash('Senha-Nova-123'));
  });

  it('deve permitir desativar ou rebaixar outro administrador quando sobra um ativo', async () => {
    const { sut, users } = await makeSut();
    await users.save(makeUser({ id: OTHER_ADMIN_ID, email: 'a2@t.local', perfil: 'ADMIN' }));

    await sut.execute(OTHER_ADMIN_ID, { ativo: false }, ADMIN_ID);
    await sut.execute(OTHER_ADMIN_ID, { ativo: true, perfil: 'CONDOMINO' }, ADMIN_ID);

    expect(await users.findById(OTHER_ADMIN_ID)).toMatchObject({
      ativo: true,
      perfil: 'CONDOMINO',
    });
  });

  it('deve negar ULTIMO_ADMIN ao desativar ou rebaixar o único administrador ativo', async () => {
    const { sut, users } = await makeSut();
    const outsider = '00000000-0000-4000-8000-0000000000ee';

    const deactivate = await sut.execute(ADMIN_ID, { ativo: false }, outsider).catch((e) => e);
    const demote = await sut.execute(ADMIN_ID, { perfil: 'VISITANTE' }, outsider).catch((e) => e);
    const rename = await sut.execute(ADMIN_ID, { nome: 'Novo Nome' }, outsider);

    expect(deactivate).toMatchObject({ code: 'ULTIMO_ADMIN', status: 409 });
    expect(demote).toMatchObject({ code: 'ULTIMO_ADMIN', status: 409 });
    expect(rename.nome).toBe('Novo Nome');
    expect(await users.countActiveAdmins()).toBe(1);
  });
});
