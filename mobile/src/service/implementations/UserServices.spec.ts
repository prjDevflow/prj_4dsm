import { http, HttpResponse } from 'msw';
import { useSessionStore } from '@/context/SessionStore';
import type { UsuarioCompleto } from '@/lib/types/users';
import { API_URL } from '@test/msw/handlers';
import { server } from '@test/msw/server';
import { CreateUserService } from './CreateUserService';
import { GetUserService } from './GetUserService';
import { ListUsersService } from './ListUsersService';
import { UpdateUserService } from './UpdateUserService';

// Examples of backend/openapi.yaml.
const maria: UsuarioCompleto = {
  id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  nome: 'Maria Souza',
  email: 'maria@exemplo.com',
  perfil: 'CONDOMINO',
  ativo: true,
  criadoEm: '2026-10-21T14:32:07.000Z',
};

const conflict = (code: string, message: string) =>
  HttpResponse.json({ error: { code, message } }, { status: 409 });

describe('serviços de usuários', () => {
  beforeEach(() =>
    useSessionStore.setState({ token: 'token-admin', usuario: null, expired: false }),
  );

  describe('ListUsersService', () => {
    it('chama GET /users com os filtros, a página e o Bearer, e devolve a página', async () => {
      let url: URL | null = null;
      let authorization: string | null = null;
      server.use(
        http.get(`${API_URL}/users`, ({ request }) => {
          url = new URL(request.url);
          authorization = request.headers.get('authorization');
          return HttpResponse.json({ data: [maria], page: 2, pageSize: 20, total: 21 });
        }),
      );

      const page = await new ListUsersService().exec({
        perfil: 'CONDOMINO',
        ativo: true,
        q: 'mar',
        page: 2,
        pageSize: 20,
      });

      expect(Object.fromEntries(url!.searchParams)).toEqual({
        perfil: 'CONDOMINO',
        ativo: 'true',
        q: 'mar',
        page: '2',
        pageSize: '20',
      });
      expect(authorization).toBe('Bearer token-admin');
      expect(page).toEqual({ data: [maria], page: 2, pageSize: 20, total: 21 });
    });

    it('não envia os filtros vazios', async () => {
      let params: Record<string, string> = {};
      server.use(
        http.get(`${API_URL}/users`, ({ request }) => {
          params = Object.fromEntries(new URL(request.url).searchParams);
          return HttpResponse.json({ data: [], page: 1, pageSize: 20, total: 0 });
        }),
      );

      await new ListUsersService().exec({ page: 1, pageSize: 20 });

      expect(params).toEqual({ page: '1', pageSize: '20' });
    });
  });

  describe('GetUserService', () => {
    it('chama GET /users/:id', async () => {
      let path = '';
      server.use(
        http.get(`${API_URL}/users/:id`, ({ request }) => {
          path = new URL(request.url).pathname;
          return HttpResponse.json(maria);
        }),
      );

      await expect(new GetUserService().exec(maria.id)).resolves.toEqual(maria);
      expect(path).toBe(`/api/v1/users/${maria.id}`);
    });

    it('404 vira ApiError NOT_FOUND', async () => {
      server.use(
        http.get(`${API_URL}/users/:id`, () =>
          HttpResponse.json(
            { error: { code: 'NOT_FOUND', message: 'Usuário não encontrado' } },
            { status: 404 },
          ),
        ),
      );

      await expect(new GetUserService().exec(maria.id)).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });
  });

  describe('CreateUserService', () => {
    it('chama POST /users com { nome, email, perfil, senha } e devolve o usuário criado', async () => {
      let request: { method: string; body: unknown } | null = null;
      server.use(
        http.post(`${API_URL}/users`, async ({ request: req }) => {
          request = { method: req.method, body: await req.json() };
          return HttpResponse.json(maria, { status: 201 });
        }),
      );

      const body = {
        nome: 'Maria Souza',
        email: 'maria@exemplo.com',
        perfil: 'CONDOMINO' as const,
        senha: 'Senha-Valida-123',
      };

      await expect(new CreateUserService().exec(body)).resolves.toEqual(maria);
      expect(request).toEqual({ method: 'POST', body });
    });

    it('409 EMAIL_JA_CADASTRADO vira ApiError com o código', async () => {
      server.use(
        http.post(`${API_URL}/users`, () =>
          conflict('EMAIL_JA_CADASTRADO', 'Já existe um usuário com este e-mail'),
        ),
      );

      await expect(
        new CreateUserService().exec({
          nome: 'Maria Souza',
          email: 'admin@dev.local',
          perfil: 'ADMIN',
          senha: 'Senha-Valida-123',
        }),
      ).rejects.toMatchObject({ status: 409, code: 'EMAIL_JA_CADASTRADO' });
    });

    it('422 traz os details de cada campo', async () => {
      const details = [{ field: 'senha', message: 'deve ter no mínimo 8 caracteres' }];
      server.use(
        http.post(`${API_URL}/users`, () =>
          HttpResponse.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos', details } },
            { status: 422 },
          ),
        ),
      );

      await expect(
        new CreateUserService().exec({
          nome: 'Maria Souza',
          email: 'maria@exemplo.com',
          perfil: 'CONDOMINO',
          senha: 'curta',
        }),
      ).rejects.toMatchObject({ status: 422, details });
    });
  });

  describe('UpdateUserService', () => {
    it('chama PATCH /users/:id só com o corpo recebido', async () => {
      let request: { method: string; path: string; body: unknown } | null = null;
      server.use(
        http.patch(`${API_URL}/users/:id`, async ({ request: req }) => {
          request = {
            method: req.method,
            path: new URL(req.url).pathname,
            body: await req.json(),
          };
          return HttpResponse.json({ ...maria, ativo: false });
        }),
      );

      const updated = await new UpdateUserService().exec(maria.id, { ativo: false });

      expect(request).toEqual({
        method: 'PATCH',
        path: `/api/v1/users/${maria.id}`,
        body: { ativo: false },
      });
      expect(updated.ativo).toBe(false);
    });

    it('409 AUTO_DESATIVACAO vira ApiError com o código', async () => {
      server.use(
        http.patch(`${API_URL}/users/:id`, () =>
          conflict(
            'AUTO_DESATIVACAO',
            'Você não pode desativar a si mesmo nem alterar o seu próprio perfil',
          ),
        ),
      );

      await expect(new UpdateUserService().exec(maria.id, { ativo: false })).rejects.toMatchObject({
        status: 409,
        code: 'AUTO_DESATIVACAO',
      });
    });
  });
});
