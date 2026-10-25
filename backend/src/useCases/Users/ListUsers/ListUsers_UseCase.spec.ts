import { describe, expect, it } from 'vitest';
import { InMemoryUserRepository } from '../../../../test/doubles/InMemoryUserRepository';
import { makeUser } from '../../../../test/factories/makeUser';
import { ListUsersUseCase } from './ListUsers_UseCase';

const makeSut = async () => {
  const users = new InMemoryUserRepository();
  await users.save(
    makeUser({ id: 'u1', nome: 'Ana Admin', email: 'ana@teste.local', perfil: 'ADMIN' }),
  );
  await users.save(
    makeUser({ id: 'u2', nome: 'Bruno Morador', email: 'bruno@casa.local', perfil: 'CONDOMINO' }),
  );
  await users.save(
    makeUser({
      id: 'u3',
      nome: 'Carla Visita',
      email: 'carla@teste.local',
      perfil: 'VISITANTE',
      ativo: false,
    }),
  );
  await users.save(
    makeUser({ id: 'u4', nome: 'Davi Morador', email: 'davi@teste.local', perfil: 'CONDOMINO' }),
  );
  const sut = new ListUsersUseCase(users);
  return { sut, users };
};

const defaults = { page: 1, pageSize: 20 };
const names = (result: { data: { nome: string }[] }) => result.data.map((u) => u.nome);

describe('ListUsers', () => {
  it('deve devolver todos ordenados por nome quando não há filtro', async () => {
    const { sut } = await makeSut();

    const result = await sut.execute(defaults);

    expect(names(result)).toEqual(['Ana Admin', 'Bruno Morador', 'Carla Visita', 'Davi Morador']);
    expect(result).toMatchObject({ page: 1, pageSize: 20, total: 4 });
  });

  it('deve filtrar por perfil', async () => {
    const { sut } = await makeSut();

    const result = await sut.execute({ ...defaults, perfil: 'CONDOMINO' });

    expect(names(result)).toEqual(['Bruno Morador', 'Davi Morador']);
  });

  it('deve filtrar por ativo, verdadeiro e falso', async () => {
    const { sut } = await makeSut();

    const inactive = await sut.execute({ ...defaults, ativo: false });
    const active = await sut.execute({ ...defaults, ativo: true });

    expect(names(inactive)).toEqual(['Carla Visita']);
    expect(names(active)).toEqual(['Ana Admin', 'Bruno Morador', 'Davi Morador']);
  });

  it('deve buscar q no nome e no e-mail sem diferenciar maiúsculas', async () => {
    const { sut } = await makeSut();

    const byName = await sut.execute({ ...defaults, q: 'MORADOR' });
    const byEmail = await sut.execute({ ...defaults, q: 'Casa.Local' });

    expect(names(byName)).toEqual(['Bruno Morador', 'Davi Morador']);
    expect(names(byEmail)).toEqual(['Bruno Morador']);
  });

  it('deve combinar perfil, ativo e q', async () => {
    const { sut } = await makeSut();

    const result = await sut.execute({ ...defaults, perfil: 'CONDOMINO', ativo: true, q: 'davi' });

    expect(names(result)).toEqual(['Davi Morador']);
    expect(result.total).toBe(1);
  });

  it('deve paginar e informar o total antes da paginação', async () => {
    const { sut } = await makeSut();

    const second = await sut.execute({ page: 2, pageSize: 3 });

    expect(names(second)).toEqual(['Davi Morador']);
    expect(second).toMatchObject({ page: 2, pageSize: 3, total: 4 });
  });

  it('deve devolver os usuários sem o senhaHash', async () => {
    const { sut } = await makeSut();

    const result = await sut.execute(defaults);

    for (const user of result.data) expect(user).not.toHaveProperty('senhaHash');
  });
});
