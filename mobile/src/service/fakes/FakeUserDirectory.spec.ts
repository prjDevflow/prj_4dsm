import type { UsuarioCompleto } from '@/lib/types/users';
import { FakeUserDirectory } from './FakeUserDirectory';
import { sampleAdmin, sampleUsers } from './sampleData';

const user = (nome: string, perfil: UsuarioCompleto['perfil'], ativo = true): UsuarioCompleto => ({
  id: `id-${nome.toLowerCase().replace(/\s+/g, '-')}`,
  nome,
  email: `${nome.toLowerCase().replace(/\s+/g, '.')}@email.com`,
  perfil,
  ativo,
  criadoEm: '2026-10-21T14:32:07.000Z',
});

const people = () => [
  user('Maria Souza', 'CONDOMINO'),
  user('Carla Mendes', 'ADMIN'),
  user('João Pereira', 'VISITANTE'),
  user('Ana Lima', 'CONDOMINO', false),
];

const names = (directory: FakeUserDirectory, params = {}) =>
  directory.list({ page: 1, pageSize: 20, ...params }).data.map(({ nome }) => nome);

describe('FakeUserDirectory', () => {
  it('lista ordenada por nome, com o total', () => {
    const directory = new FakeUserDirectory(people());

    expect(names(directory)).toEqual(['Ana Lima', 'Carla Mendes', 'João Pereira', 'Maria Souza']);
    expect(directory.list({ page: 1, pageSize: 20 }).total).toBe(4);
  });

  it('combina perfil, ativo e busca em parte do nome ou do e-mail, sem diferenciar maiúsculas', () => {
    const directory = new FakeUserDirectory(people());

    expect(names(directory, { perfil: 'CONDOMINO' })).toEqual(['Ana Lima', 'Maria Souza']);
    expect(names(directory, { perfil: 'CONDOMINO', ativo: true })).toEqual(['Maria Souza']);
    expect(names(directory, { q: 'PEREIRA' })).toEqual(['João Pereira']);
    expect(names(directory, { q: 'carla.mendes@' })).toEqual(['Carla Mendes']);
    expect(names(directory, { q: 'a', ativo: false })).toEqual(['Ana Lima']);
  });

  it('pagina com page e pageSize', () => {
    const directory = new FakeUserDirectory(people());

    expect(directory.list({ page: 2, pageSize: 3 })).toMatchObject({
      page: 2,
      pageSize: 3,
      total: 4,
      data: [expect.objectContaining({ nome: 'Maria Souza' })],
    });
  });

  it('cria com o e-mail em minúsculas, ativo e com data', () => {
    const directory = new FakeUserDirectory(people());

    const created = directory.create({
      nome: 'Bruno Alves',
      email: 'Bruno@Email.com',
      perfil: 'VISITANTE',
      senha: 'Senha-Valida-123',
    });

    expect(created).toMatchObject({ nome: 'Bruno Alves', email: 'bruno@email.com', ativo: true });
    expect(created).not.toHaveProperty('senha');
    expect(directory.get(created.id)).toEqual(created);
  });

  it('e-mail já usado (com outra caixa) dá 409 EMAIL_JA_CADASTRADO', () => {
    const directory = new FakeUserDirectory(people());

    expect(() =>
      directory.create({
        nome: 'Outra Maria',
        email: 'MARIA.SOUZA@email.com',
        perfil: 'CONDOMINO',
        senha: 'Senha-Valida-123',
      }),
    ).toThrow(expect.objectContaining({ status: 409, code: 'EMAIL_JA_CADASTRADO' }));
  });

  it('altera só os campos enviados', () => {
    const directory = new FakeUserDirectory(people());

    const updated = directory.update(
      'id-maria-souza',
      { nome: 'Maria S. Souza' },
      'id-carla-mendes',
    );

    expect(updated).toMatchObject({ nome: 'Maria S. Souza', perfil: 'CONDOMINO', ativo: true });
  });

  it('id que não existe dá 404 NOT_FOUND', () => {
    const directory = new FakeUserDirectory(people());

    expect(() => directory.get('nao-existe')).toThrow(
      expect.objectContaining({ status: 404, code: 'NOT_FOUND' }),
    );
    expect(() => directory.update('nao-existe', { ativo: false }, 'id-carla-mendes')).toThrow(
      expect.objectContaining({ status: 404 }),
    );
  });

  it('o administrador não desativa a si mesmo nem muda o próprio perfil (409 AUTO_DESATIVACAO)', () => {
    const directory = new FakeUserDirectory(people());

    for (const body of [{ ativo: false }, { perfil: 'CONDOMINO' as const }]) {
      expect(() => directory.update('id-carla-mendes', body, 'id-carla-mendes')).toThrow(
        expect.objectContaining({ status: 409, code: 'AUTO_DESATIVACAO' }),
      );
    }
  });

  it('nunca fica sem administrador ativo (409 ULTIMO_ADMIN)', () => {
    const directory = new FakeUserDirectory(people());

    expect(() => directory.update('id-carla-mendes', { ativo: false }, 'id-maria-souza')).toThrow(
      expect.objectContaining({ status: 409, code: 'ULTIMO_ADMIN' }),
    );
  });

  it('enviar o e-mail no PATCH dá 422', () => {
    const directory = new FakeUserDirectory(people());

    expect(() =>
      directory.update(
        'id-maria-souza',
        { email: 'nova@email.com' } as unknown as { nome: string },
        'id-carla-mendes',
      ),
    ).toThrow(expect.objectContaining({ status: 422, code: 'VALIDATION_ERROR' }));
  });

  it('sem lista, começa com os usuários do seed e mais gente para a paginação aparecer', () => {
    const directory = new FakeUserDirectory();

    expect(directory.get(sampleAdmin.id)).toMatchObject({ email: 'admin@dev.local', ativo: true });
    expect(directory.list({ page: 1, pageSize: 20 }).total).toBe(sampleUsers.length);
    expect(sampleUsers.length).toBeGreaterThan(20);
  });
});
