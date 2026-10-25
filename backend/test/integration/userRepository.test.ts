import { beforeEach, describe, expect, it } from 'vitest';
import { PrismaUserRepository } from '../../src/infra/repositories/PrismaUserRepository';
import { makeUser } from '../factories/makeUser';
import { BCRYPT_HASH, insertUser, newId, prisma, resetDatabase } from './helpers';

describe('PrismaUserRepository', () => {
  const repository = new PrismaUserRepository(prisma);
  beforeEach(resetDatabase);

  it('findByEmail devolve a entidade User com todos os campos', async () => {
    const row = await insertUser({ nome: 'Maria', email: 'maria@teste.local', perfil: 'ADMIN' });

    const user = await repository.findByEmail('maria@teste.local');

    expect(user).toEqual({
      id: row.id,
      nome: 'Maria',
      email: 'maria@teste.local',
      senhaHash: row.senhaHash,
      perfil: 'ADMIN',
      ativo: true,
      criadoEm: row.criadoEm,
      atualizadoEm: row.atualizadoEm,
    });
  });

  it('findByEmail devolve null quando o e-mail não existe', async () => {
    expect(await repository.findByEmail('ninguem@teste.local')).toBeNull();
  });

  it('findById devolve o usuário, inclusive o inativo', async () => {
    const row = await insertUser({ ativo: false });

    const user = await repository.findById(row.id);

    expect(user?.id).toBe(row.id);
    expect(user?.ativo).toBe(false);
  });

  it('findById devolve null quando o id não existe', async () => {
    expect(await repository.findById(newId())).toBeNull();
  });

  it('existsByEmail diz se o e-mail já está cadastrado', async () => {
    await insertUser({ email: 'maria@teste.local' });

    expect(await repository.existsByEmail('maria@teste.local')).toBe(true);
    expect(await repository.existsByEmail('outra@teste.local')).toBe(false);
  });

  it('save insere um usuário novo e depois atualiza o mesmo id', async () => {
    const id = newId();
    const user = makeUser({ id, email: 'novo@teste.local', senhaHash: BCRYPT_HASH });

    await repository.save(user);
    const inserted = await repository.findById(id);
    await repository.save({ ...inserted!, nome: 'Nome Novo', ativo: false, perfil: 'ADMIN' });
    const updated = await repository.findById(id);

    expect(inserted).toMatchObject({ id, nome: user.nome, email: 'novo@teste.local', ativo: true });
    expect(updated).toMatchObject({ id, nome: 'Nome Novo', ativo: false, perfil: 'ADMIN' });
    expect(await prisma.user.count()).toBe(1);
  });

  it('save recusa e-mail já usado por outro usuário com EMAIL_JA_CADASTRADO', async () => {
    await insertUser({ email: 'maria@teste.local' });
    const duplicate = makeUser({ id: newId(), email: 'maria@teste.local', senhaHash: BCRYPT_HASH });

    const error = await repository.save(duplicate).catch((e: unknown) => e);

    expect(error).toMatchObject({ code: 'EMAIL_JA_CADASTRADO', status: 409 });
    expect(await prisma.user.count()).toBe(1);
  });

  it('save grava criadoEm e atualizadoEm recebidos da entidade', async () => {
    const id = newId();
    const criadoEm = new Date('2026-10-21T10:00:00.000Z');

    await repository.save(
      makeUser({
        id,
        email: 'datas@teste.local',
        senhaHash: BCRYPT_HASH,
        criadoEm,
        atualizadoEm: criadoEm,
      }),
    );

    expect(await repository.findById(id)).toMatchObject({ criadoEm, atualizadoEm: criadoEm });
  });

  describe('list', () => {
    const seed = async () => {
      await insertUser({ nome: 'Ana Admin', email: 'ana@teste.local', perfil: 'ADMIN' });
      await insertUser({ nome: 'Bruno Morador', email: 'bruno@casa.local', perfil: 'CONDOMINO' });
      await insertUser({ nome: 'Carla Visita', email: 'carla@teste.local', ativo: false });
      await insertUser({ nome: 'Davi Morador', email: 'davi@teste.local', perfil: 'CONDOMINO' });
    };
    const defaults = { page: 1, pageSize: 20 };
    const names = (result: { items: { nome: string }[] }) => result.items.map((u) => u.nome);

    beforeEach(seed);

    it('ordena por nome e devolve o total', async () => {
      const result = await repository.list(defaults);

      expect(names(result)).toEqual(['Ana Admin', 'Bruno Morador', 'Carla Visita', 'Davi Morador']);
      expect(result.total).toBe(4);
    });

    it('filtra por perfil e por ativo', async () => {
      expect(names(await repository.list({ ...defaults, perfil: 'CONDOMINO' }))).toEqual([
        'Bruno Morador',
        'Davi Morador',
      ]);
      expect(names(await repository.list({ ...defaults, ativo: false }))).toEqual(['Carla Visita']);
    });

    it('busca q no nome e no e-mail sem diferenciar maiúsculas', async () => {
      expect(names(await repository.list({ ...defaults, q: 'MORADOR' }))).toEqual([
        'Bruno Morador',
        'Davi Morador',
      ]);
      expect(names(await repository.list({ ...defaults, q: 'Casa.LOCAL' }))).toEqual([
        'Bruno Morador',
      ]);
    });

    it('trata %, _ e \\ em q como texto comum, não como curinga', async () => {
      expect((await repository.list({ ...defaults, q: '%' })).total).toBe(0);
      expect((await repository.list({ ...defaults, q: '_' })).total).toBe(0);
      expect((await repository.list({ ...defaults, q: '\\' })).total).toBe(0);
    });

    it('combina os filtros', async () => {
      const result = await repository.list({
        ...defaults,
        perfil: 'CONDOMINO',
        ativo: true,
        q: 'davi',
      });

      expect(names(result)).toEqual(['Davi Morador']);
      expect(result.total).toBe(1);
    });

    it('pagina e informa o total antes da paginação', async () => {
      const second = await repository.list({ page: 2, pageSize: 3 });

      expect(names(second)).toEqual(['Davi Morador']);
      expect(second.total).toBe(4);
    });

    it('devolve entidades com o senhaHash, para o use case decidir o que expor', async () => {
      const result = await repository.list(defaults);

      expect(result.items[0]).toHaveProperty('senhaHash');
    });
  });

  it('countActiveAdmins conta só administradores ativos', async () => {
    await insertUser({ perfil: 'ADMIN' });
    await insertUser({ perfil: 'ADMIN', ativo: false });
    await insertUser({ perfil: 'CONDOMINO' });

    expect(await repository.countActiveAdmins()).toBe(1);
  });
});
