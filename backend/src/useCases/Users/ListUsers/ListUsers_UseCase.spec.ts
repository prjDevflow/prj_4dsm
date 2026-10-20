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

  it.todo('deve filtrar por perfil');
  it.todo('deve filtrar por ativo, verdadeiro e falso');
  it.todo('deve buscar q no nome e no e-mail sem diferenciar maiúsculas');
  it.todo('deve combinar perfil, ativo e q');
  it.todo('deve paginar e informar o total antes da paginação');
  it.todo('deve devolver os usuários sem o senhaHash');
});
