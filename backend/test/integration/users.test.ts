import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/main/app';
import {
  PASSWORD,
  insertUser,
  insertUserWithPassword,
  newId,
  prisma,
  resetDatabase,
  tokenFor,
} from './helpers';

const app = createApp();
const bearer = (user: Parameters<typeof tokenFor>[0]) => `Bearer ${tokenFor(user)}`;

const validBody = {
  nome: 'Maria Souza',
  email: 'Maria@Teste.local',
  perfil: 'CONDOMINO',
  senha: 'Senha-Valida-123',
};

const asAdmin = () => insertUser({ nome: 'Admin', perfil: 'ADMIN' });

describe('rotas /api/v1/users', () => {
  beforeEach(resetDatabase);

  describe('POST /users', () => {
    it('201 com o usuário sem senhaHash, e-mail em minúsculas e senha gravada como hash', async () => {
      const admin = await asAdmin();

      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', bearer(admin))
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: expect.any(String),
        nome: 'Maria Souza',
        email: 'maria@teste.local',
        perfil: 'CONDOMINO',
        ativo: true,
        criadoEm: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
      });
      const saved = await prisma.user.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(saved.senhaHash).not.toBe(validBody.senha);
      expect(await bcrypt.compare(validBody.senha, saved.senhaHash)).toBe(true);
    });

    it('409 EMAIL_JA_CADASTRADO quando o e-mail já existe, mesmo com outra caixa', async () => {
      const admin = await asAdmin();
      await insertUser({ email: 'maria@teste.local' });

      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', bearer(admin))
        .send({ ...validBody, email: 'MARIA@TESTE.LOCAL' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_JA_CADASTRADO');
    });

    it('422 com detalhes por campo para perfil inválido', async () => {
      const admin = await asAdmin();

      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', bearer(admin))
        .send({ ...validBody, perfil: 'SINDICO' });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual([expect.objectContaining({ field: 'perfil' })]);
    });

    it('422 para senha de 7 caracteres e 201 para 8', async () => {
      const admin = await asAdmin();
      const post = (body: object) =>
        request(app).post('/api/v1/users').set('Authorization', bearer(admin)).send(body);

      const short = await post({ ...validBody, senha: '1234567' });
      const ok = await post({ ...validBody, senha: '12345678' });

      expect(short.status).toBe(422);
      expect(short.body.error.details).toEqual([expect.objectContaining({ field: 'senha' })]);
      expect(ok.status).toBe(201);
    });

    it('422 para senha com mais de 72 bytes, que o bcrypt cortaria em silêncio', async () => {
      const admin = await asAdmin();

      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', bearer(admin))
        .send({ ...validBody, senha: 'ç'.repeat(37) });

      expect(res.status).toBe(422);
      expect(res.body.error.details).toEqual([expect.objectContaining({ field: 'senha' })]);
    });

    it('422 para nome curto, e-mail inválido e campos ausentes', async () => {
      const admin = await asAdmin();

      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', bearer(admin))
        .send({ nome: 'Al', email: 'nao-e-email' });

      expect(res.status).toBe(422);
      expect(res.body.error.details.map((d: { field: string }) => d.field).sort()).toEqual([
        'email',
        'nome',
        'perfil',
        'senha',
      ]);
    });
  });

  describe('permissões', () => {
    it('401 sem token em todas as rotas', async () => {
      const id = newId();

      const results = await Promise.all([
        request(app).post('/api/v1/users').send(validBody),
        request(app).get('/api/v1/users'),
        request(app).get(`/api/v1/users/${id}`),
        request(app).patch(`/api/v1/users/${id}`).send({ nome: 'Novo Nome' }),
      ]);

      expect(results.map((r) => r.status)).toEqual([401, 401, 401, 401]);
    });

    it.each(['CONDOMINO', 'VISITANTE'] as const)(
      '403 para %s em todas as rotas',
      async (perfil) => {
        const user = await insertUser({ perfil });
        const target = await insertUser();
        const auth = bearer(user);

        const results = await Promise.all([
          request(app).post('/api/v1/users').set('Authorization', auth).send(validBody),
          request(app).get('/api/v1/users').set('Authorization', auth),
          request(app).get(`/api/v1/users/${target.id}`).set('Authorization', auth),
          request(app)
            .patch(`/api/v1/users/${target.id}`)
            .set('Authorization', auth)
            .send({ nome: 'Novo Nome' }),
        ]);

        expect(results.map((r) => r.status)).toEqual([403, 403, 403, 403]);
        expect(results.every((r) => r.body.error.code === 'FORBIDDEN')).toBe(true);
      },
    );
  });

  describe('GET /users', () => {
    it('200 paginado, ordenado por nome e filtrável', async () => {
      const admin = await insertUser({
        nome: 'Ana Admin',
        email: 'ana@teste.local',
        perfil: 'ADMIN',
      });
      await insertUser({ nome: 'Bruno Morador', email: 'bruno@casa.local', perfil: 'CONDOMINO' });
      await insertUser({ nome: 'Carla Visita', email: 'carla@teste.local', ativo: false });
      await insertUser({ nome: 'Davi Morador', email: 'davi@teste.local', perfil: 'CONDOMINO' });
      const get = (query: string) =>
        request(app).get(`/api/v1/users${query}`).set('Authorization', bearer(admin));
      const names = (res: request.Response) => res.body.data.map((u: { nome: string }) => u.nome);

      const all = await get('');
      const byProfile = await get('?perfil=CONDOMINO');
      const inactive = await get('?ativo=false');
      const search = await get('?q=CASA');
      const page2 = await get('?page=2&pageSize=3');

      expect(all.status).toBe(200);
      expect(all.body).toMatchObject({ page: 1, pageSize: 20, total: 4 });
      expect(names(all)).toEqual(['Ana Admin', 'Bruno Morador', 'Carla Visita', 'Davi Morador']);
      expect(names(byProfile)).toEqual(['Bruno Morador', 'Davi Morador']);
      expect(names(inactive)).toEqual(['Carla Visita']);
      expect(names(search)).toEqual(['Bruno Morador']);
      expect(page2.body).toMatchObject({ page: 2, pageSize: 3, total: 4 });
      expect(names(page2)).toEqual(['Davi Morador']);
    });

    it('422 para pageSize acima de 100, page zero e filtros inválidos', async () => {
      const admin = await asAdmin();
      const get = (query: string) =>
        request(app).get(`/api/v1/users${query}`).set('Authorization', bearer(admin));

      const results = await Promise.all([
        get('?pageSize=101'),
        get('?page=0'),
        get('?perfil=SINDICO'),
        get('?ativo=talvez'),
      ]);

      expect(results.map((r) => r.status)).toEqual([422, 422, 422, 422]);
      expect((await get('?pageSize=100')).status).toBe(200);
    });
  });

  describe('GET /users/:id', () => {
    it('200 com o usuário', async () => {
      const admin = await asAdmin();
      const target = await insertUser({ nome: 'Maria Souza', perfil: 'CONDOMINO' });

      const res = await request(app)
        .get(`/api/v1/users/${target.id}`)
        .set('Authorization', bearer(admin));

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: target.id,
        nome: 'Maria Souza',
        email: target.email,
        perfil: 'CONDOMINO',
        ativo: true,
        criadoEm: target.criadoEm.toISOString(),
      });
    });

    it('404 para id inexistente e para id que não é UUID', async () => {
      const admin = await asAdmin();

      const missing = await request(app)
        .get(`/api/v1/users/${newId()}`)
        .set('Authorization', bearer(admin));
      const malformed = await request(app)
        .get('/api/v1/users/nao-e-uuid')
        .set('Authorization', bearer(admin));

      expect(missing.status).toBe(404);
      expect(missing.body.error.code).toBe('NOT_FOUND');
      expect(malformed.status).toBe(404);
      expect(malformed.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PATCH /users/:id', () => {
    it('200 e grava nome, perfil e ativo', async () => {
      const admin = await asAdmin();
      const target = await insertUser({ perfil: 'VISITANTE' });

      const res = await request(app)
        .patch(`/api/v1/users/${target.id}`)
        .set('Authorization', bearer(admin))
        .send({ nome: 'Nome Atualizado', perfil: 'CONDOMINO', ativo: false });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: target.id,
        nome: 'Nome Atualizado',
        perfil: 'CONDOMINO',
        ativo: false,
      });
      expect(await prisma.user.findUniqueOrThrow({ where: { id: target.id } })).toMatchObject({
        nome: 'Nome Atualizado',
        perfil: 'CONDOMINO',
        ativo: false,
      });
    });

    it('422 quando o corpo traz email, campo desconhecido ou nada', async () => {
      const admin = await asAdmin();
      const target = await insertUser();
      const patch = (body: object) =>
        request(app)
          .patch(`/api/v1/users/${target.id}`)
          .set('Authorization', bearer(admin))
          .send(body);

      const withEmail = await patch({ email: 'novo@teste.local' });
      const unknown = await patch({ nome: 'Nome Válido', foo: 1 });
      const empty = await patch({});
      const shortPassword = await patch({ senha: '1234567' });

      expect([withEmail.status, unknown.status, empty.status, shortPassword.status]).toEqual([
        422, 422, 422, 422,
      ]);
      expect(withEmail.body.error.code).toBe('VALIDATION_ERROR');
      expect((await prisma.user.findUniqueOrThrow({ where: { id: target.id } })).email).toBe(
        target.email,
      );
    });

    it('404 para usuário inexistente', async () => {
      const admin = await asAdmin();

      const res = await request(app)
        .patch(`/api/v1/users/${newId()}`)
        .set('Authorization', bearer(admin))
        .send({ nome: 'Nome Válido' });

      expect(res.status).toBe(404);
    });

    it('409 AUTO_DESATIVACAO quando o administrador se desativa ou rebaixa', async () => {
      const admin = await asAdmin();
      const patch = (body: object) =>
        request(app)
          .patch(`/api/v1/users/${admin.id}`)
          .set('Authorization', bearer(admin))
          .send(body);

      const deactivate = await patch({ ativo: false });
      const demote = await patch({ perfil: 'CONDOMINO' });

      expect(deactivate.status).toBe(409);
      expect(deactivate.body.error.code).toBe('AUTO_DESATIVACAO');
      expect(demote.status).toBe(409);
      expect(demote.body.error.code).toBe('AUTO_DESATIVACAO');
      expect(await prisma.user.findUniqueOrThrow({ where: { id: admin.id } })).toMatchObject({
        ativo: true,
        perfil: 'ADMIN',
      });
    });

    it('desativar o usuário impede o login e invalida o token que ele já tinha', async () => {
      const admin = await asAdmin();
      const user = await insertUserWithPassword({
        email: 'maria@teste.local',
        perfil: 'CONDOMINO',
      });
      const login = () =>
        request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'maria@teste.local', senha: PASSWORD });
      const oldToken = (await login()).body.accessToken as string;
      expect(
        (await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${oldToken}`))
          .status,
      ).toBe(200);

      await request(app)
        .patch(`/api/v1/users/${user.id}`)
        .set('Authorization', bearer(admin))
        .send({ ativo: false })
        .expect(200);

      const afterLogin = await login();
      const afterMe = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${oldToken}`);
      expect(afterLogin.status).toBe(403);
      expect(afterLogin.body.error.code).toBe('USUARIO_INATIVO');
      expect(afterMe.status).toBe(401);
    });

    it('trocar a senha faz o login passar a aceitar só a nova', async () => {
      const admin = await asAdmin();
      const user = await insertUserWithPassword({ email: 'maria@teste.local' });
      const login = (senha: string) =>
        request(app).post('/api/v1/auth/login').send({ email: 'maria@teste.local', senha });

      await request(app)
        .patch(`/api/v1/users/${user.id}`)
        .set('Authorization', bearer(admin))
        .send({ senha: 'Outra-Senha-456' })
        .expect(200);

      expect((await login('Outra-Senha-456')).status).toBe(200);
      expect((await login(PASSWORD)).status).toBe(401);
    });
  });

  it('nenhuma resposta contém senhaHash nem um hash bcrypt', async () => {
    const admin = await asAdmin();
    const other = await insertUserWithPassword({ email: 'outra@teste.local' });
    const auth = bearer(admin);

    const responses = [
      await request(app).post('/api/v1/users').set('Authorization', auth).send(validBody),
      await request(app).get('/api/v1/users').set('Authorization', auth),
      await request(app).get(`/api/v1/users/${other.id}`).set('Authorization', auth),
      await request(app)
        .patch(`/api/v1/users/${other.id}`)
        .set('Authorization', auth)
        .send({ senha: 'Outra-Senha-456', nome: 'Nome Novo' }),
    ];

    expect(responses.map((r) => r.status)).toEqual([201, 200, 200, 200]);
    for (const res of responses) {
      expect(res.text).not.toContain('senhaHash');
      expect(res.text).not.toContain('$2');
    }
  });
});
