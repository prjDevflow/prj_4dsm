import type { User } from '../../entities/User';
import type { IUserRepository } from '../../repositories/IUserRepository';
import { NotFoundError, ValidationError } from '../../shared/errors/AppError';

/** The user a tag is linked to: 404 when there is none, 422 on `usuarioId` when the account is inactive. */
export async function requireActiveUser(users: IUserRepository, id: string): Promise<User> {
  const user = await users.findById(id);
  if (!user) throw new NotFoundError('Usuário não encontrado');
  if (!user.ativo) {
    throw new ValidationError('Dados inválidos', [
      { field: 'usuarioId', message: 'Usuário inativo' },
    ]);
  }
  return user;
}
