import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/main/app';
import { authenticate, authorize } from '../../src/main/middlewares';
import {
  PASSWORD,
  expiredTokenFor,
  insertUserWithPassword,
  prisma,
  resetDatabase,
  tokenFor,
} from './helpers';

// Each test gets a new app, so the login rate limiter always starts empty.
const makeApp = () =>
  createApp({
    extraRoutes: (router) => {
      router.get('/_test/qualquer', authenticate(), (req, res) => {
        res.json(req.auth);
      });
      router.get('/_test/inativo-ok', authenticate({ allowInactive: true }), (req, res) => {
        res.json(req.auth);
      });
      router.get('/_test/admin', authenticate(), authorize('ADMIN'), (_req, res) => {
        res.json({ ok: true });
      });
    },
  });

describe('POST /api/v1/auth/login', () => {
  beforeEach(resetDatabase);

  it('200 com o formato do contrato e sem hash da senha', async () => {
    const user = await insertUserWithPassword({
      nome: 'Maria',
      email: 'maria@teste.local',
      perfil: 'CONDOMINO',
    });

    const res = await request(makeApp())
      .post('/api/v1/auth/login')
      .send({ email: 'maria@teste.local', senha: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      accessToken: expect.any(String),
      tokenType: 'Bearer',
      expiresIn: 43200,
      usuario: { id: user.id, nome: 'Maria', email: 'maria@teste.local', perfil: 'CONDOMINO' },
    });
    expect(JSON.stringify(res.body)).not.toMatch(/senhaHash|\$2[aby]\$/);
  });

  it('o token devolvido é aceito pelo GET /auth/me', async () => {
    await insertUserWithPassword({ email: 'maria@teste.local' });
    const app = makeApp();

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'maria@teste.local', senha: PASSWORD });
    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`);

    expect(me.status).toBe(200);
    expect(me.body.email).toBe('maria@teste.local');
  });

  it('aceita o e-mail com letras maiúsculas', async () => {
    await insertUserWithPassword({ email: 'maria@teste.local' });

    const res = await request(makeApp())
      .post('/api/v1/auth/login')
      .send({ email: 'Maria@Teste.LOCAL', senha: PASSWORD });

    expect(res.status).toBe(200);
  });

  it.each([
    ['e-mail sem formato válido', { email: 'nao-e-email', senha: PASSWORD }, 'email'],
    [
      'e-mail com mais de 254 caracteres',
      { email: `${'a'.repeat(250)}@b.co`, senha: PASSWORD },
      'email',
    ],
    ['e-mail ausente', { senha: PASSWORD }, 'email'],
    ['senha vazia', { email: 'a@b.co', senha: '' }, 'senha'],
    ['senha com mais de 72 caracteres', { email: 'a@b.co', senha: 'x'.repeat(73) }, 'senha'],
    ['senha que não é texto', { email: 'a@b.co', senha: 12345678 }, 'senha'],
  ])('422 com details por campo quando há %s', async (_name, body, field) => {
    const res = await request(makeApp()).post('/api/v1/auth/login').send(body);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([{ field, message: expect.any(String) }]),
    );
  });

  it('422 (e não 500) quando não há corpo', async () => {
    const res = await request(makeApp()).post('/api/v1/auth/login');

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('401 idêntico para senha errada e para e-mail inexistente', async () => {
    await insertUserWithPassword({ email: 'maria@teste.local' });
    const app = makeApp();

    const wrongPassword = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'maria@teste.local', senha: 'Outra-Senha-1' });
    const unknownEmail = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ninguem@teste.local', senha: PASSWORD });

    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe('CREDENCIAIS_INVALIDAS');
    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  it('403 USUARIO_INATIVO com a senha certa e 401 com a senha errada', async () => {
    await insertUserWithPassword({ email: 'inativo@teste.local', ativo: false });
    const app = makeApp();

    const rightPassword = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'inativo@teste.local', senha: PASSWORD });
    const wrongPassword = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'inativo@teste.local', senha: 'Outra-Senha-1' });

    expect(rightPassword.status).toBe(403);
    expect(rightPassword.body.error.code).toBe('USUARIO_INATIVO');
    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe('CREDENCIAIS_INVALIDAS');
  });

  it('429 RATE_LIMITED na sexta tentativa em um minuto para o mesmo e-mail', async () => {
    const app = makeApp();
    const attempt = (email: string) =>
      request(app).post('/api/v1/auth/login').send({ email, senha: 'Qualquer-Senha-1' });

    const firstFive = [];
    for (const email of ['a@b.co', 'A@b.co', 'a@B.co', 'a@b.CO', 'a@b.co']) {
      firstFive.push((await attempt(email)).status);
    }
    const sixth = await attempt('a@b.co');

    expect(firstFive).toEqual([401, 401, 401, 401, 401]);
    expect(sixth.status).toBe(429);
    expect(sixth.body.error.code).toBe('RATE_LIMITED');
    // The contract (openapi.yaml) promises how many seconds until the next try, within the 60 s window.
    const retryAfter = Number(sixth.headers['retry-after']);
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(60);
  });

  it('o limite de um e-mail não afeta outro e-mail', async () => {
    await insertUserWithPassword({ email: 'maria@teste.local' });
    const app = makeApp();
    for (let i = 0; i < 6; i += 1) {
      await request(app).post('/api/v1/auth/login').send({ email: 'a@b.co', senha: 'x' });
    }

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'maria@teste.local', senha: PASSWORD });

    expect(res.status).toBe(200);
  });
});

describe('GET /api/v1/auth/me', () => {
  beforeEach(resetDatabase);

  it('200 com id, nome, e-mail e perfil, e nada mais', async () => {
    const user = await insertUserWithPassword({ nome: 'Maria', email: 'maria@teste.local' });

    const res = await request(makeApp())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tokenFor(user)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: user.id,
      nome: 'Maria',
      email: 'maria@teste.local',
      perfil: user.perfil,
    });
  });

  it('401 UNAUTHORIZED sem token', async () => {
    const res = await request(makeApp()).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('o token de um usuário desativado para de funcionar na hora', async () => {
    const user = await insertUserWithPassword();
    const app = makeApp();
    const token = tokenFor(user);
    const before = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    await prisma.user.update({ where: { id: user.id }, data: { ativo: false } });
    const after = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);

    expect(before.status).toBe(200);
    expect(after.status).toBe(401);
    expect(after.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('rotas protegidas (authenticate e authorize)', () => {
  beforeEach(resetDatabase);

  it('401 sem token, com esquema diferente de Bearer, adulterado ou expirado', async () => {
    const user = await insertUserWithPassword({ perfil: 'ADMIN' });
    const app = makeApp();
    const valid = tokenFor(user);
    const headers = [
      undefined,
      `Basic ${valid}`,
      `Bearer ${valid}x`,
      'Bearer isto-nao-e-um-token',
      `Bearer ${expiredTokenFor(user)}`,
    ];

    const statuses = [];
    for (const header of headers) {
      const req = request(app).get('/api/v1/_test/qualquer');
      statuses.push((header ? await req.set('Authorization', header) : await req).status);
    }

    expect(statuses).toEqual([401, 401, 401, 401, 401]);
  });

  it('403 FORBIDDEN com perfil sem permissão e 200 com o perfil certo', async () => {
    const visitor = await insertUserWithPassword({ perfil: 'VISITANTE' });
    const admin = await insertUserWithPassword({ perfil: 'ADMIN' });
    const app = makeApp();

    const denied = await request(app)
      .get('/api/v1/_test/admin')
      .set('Authorization', `Bearer ${tokenFor(visitor)}`);
    const allowed = await request(app)
      .get('/api/v1/_test/admin')
      .set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('FORBIDDEN');
    expect(allowed.status).toBe(200);
  });

  it('usa o perfil atual do banco, e não o que estava no token', async () => {
    const user = await insertUserWithPassword({ perfil: 'ADMIN' });
    const app = makeApp();
    const token = tokenFor(user);

    await prisma.user.update({ where: { id: user.id }, data: { perfil: 'VISITANTE' } });
    const res = await request(app)
      .get('/api/v1/_test/admin')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('allowInactive deixa o usuário inativo passar, e o padrão recusa', async () => {
    const user = await insertUserWithPassword({ ativo: false });
    const app = makeApp();
    const auth = `Bearer ${tokenFor(user)}`;

    const strict = await request(app).get('/api/v1/_test/qualquer').set('Authorization', auth);
    const lenient = await request(app).get('/api/v1/_test/inativo-ok').set('Authorization', auth);

    expect(strict.status).toBe(401);
    expect(lenient.status).toBe(200);
    expect(lenient.body).toEqual({ userId: user.id, perfil: user.perfil });
  });
});

describe('GET /docs', () => {
  it('serve o Swagger UI com as rotas login e me e o esquema Bearer', async () => {
    const app = makeApp();

    const page = await request(app).get('/docs/');
    const init = await request(app).get('/docs/swagger-ui-init.js');

    expect(page.status).toBe(200);
    expect(page.headers['content-type']).toMatch(/text\/html/);
    expect(init.status).toBe(200);
    expect(init.text).toContain('/auth/login');
    expect(init.text).toContain('/auth/me');
    expect(init.text).toContain('bearerAuth');
  });
});
