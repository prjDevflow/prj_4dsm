import type { Page } from '@/lib/types/page';
import type {
  CreateUserBody,
  ListUsersParams,
  UpdateUserBody,
  UsuarioCompleto,
} from '@/lib/types/users';
import { ApiError } from '../ApiError';
import { sampleUsers } from './sampleData';

const notFound = () => new ApiError(404, 'NOT_FOUND', 'Usuário não encontrado');

const sortByName = (a: UsuarioCompleto, b: UsuarioCompleto) =>
  a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }) || a.id.localeCompare(b.id);

/**
 * In-memory users with the rules of the API (B06): filters, order by name, pages, unique e-mail,
 * nobody deactivates or demotes themselves, and there is always an active administrator.
 */
export class FakeUserDirectory {
  private users: UsuarioCompleto[];
  private nextId = 1;

  constructor(users: UsuarioCompleto[] = sampleUsers) {
    this.users = users.map((user) => ({ ...user }));
  }

  list({ perfil, ativo, q, page, pageSize }: ListUsersParams): Page<UsuarioCompleto> {
    const search = q?.trim().toLowerCase();
    const found = this.users
      .filter((user) => perfil === undefined || user.perfil === perfil)
      .filter((user) => ativo === undefined || user.ativo === ativo)
      .filter(
        (user) =>
          !search ||
          user.nome.toLowerCase().includes(search) ||
          user.email.toLowerCase().includes(search),
      )
      .sort(sortByName);
    const start = (page - 1) * pageSize;

    return {
      data: found.slice(start, start + pageSize).map((user) => ({ ...user })),
      page,
      pageSize,
      total: found.length,
    };
  }

  get(id: string): UsuarioCompleto {
    const user = this.users.find((candidate) => candidate.id === id);
    if (!user) throw notFound();
    return { ...user };
  }

  create({ nome, email, perfil }: CreateUserBody): UsuarioCompleto {
    const normalized = email.trim().toLowerCase();
    if (this.users.some((user) => user.email === normalized)) {
      throw new ApiError(409, 'EMAIL_JA_CADASTRADO', 'Já existe um usuário com este e-mail');
    }
    const user: UsuarioCompleto = {
      id: `fake-user-${this.nextId++}`,
      nome: nome.trim(),
      email: normalized,
      perfil,
      ativo: true,
      criadoEm: new Date().toISOString(),
    };
    this.users.push(user);
    return { ...user };
  }

  update(id: string, body: UpdateUserBody, actorId: string | undefined): UsuarioCompleto {
    if ('email' in body) {
      throw new ApiError(422, 'VALIDATION_ERROR', 'Dados inválidos', [
        { field: 'email', message: 'campo não permitido' },
      ]);
    }
    const index = this.users.findIndex((candidate) => candidate.id === id);
    if (index < 0) throw notFound();
    const user = this.users[index];

    const deactivates = body.ativo === false && user.ativo;
    const changesProfile = body.perfil !== undefined && body.perfil !== user.perfil;
    if (user.id === actorId && (deactivates || changesProfile)) {
      throw new ApiError(
        409,
        'AUTO_DESATIVACAO',
        'Você não pode desativar a si mesmo nem alterar o seu próprio perfil',
      );
    }
    const activeAdmins = this.users.filter((other) => other.perfil === 'ADMIN' && other.ativo);
    const losesAdminRole = user.perfil === 'ADMIN' && user.ativo && (deactivates || changesProfile);
    if (losesAdminRole && activeAdmins.length <= 1) {
      throw new ApiError(
        409,
        'ULTIMO_ADMIN',
        'O sistema precisa de ao menos um administrador ativo',
      );
    }

    // The password is accepted and dropped: the fake keeps no passwords.
    const updated: UsuarioCompleto = {
      ...user,
      nome: body.nome ?? user.nome,
      perfil: body.perfil ?? user.perfil,
      ativo: body.ativo ?? user.ativo,
    };
    this.users[index] = updated;
    return { ...updated };
  }
}
