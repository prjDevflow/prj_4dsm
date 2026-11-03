import { useQuery } from '@tanstack/react-query';
import { fetchAllPages } from '@/lib/fetchAllPages';
import { perfilLabel } from '@/lib/perfil';
import type { UsuarioCompleto } from '@/lib/types/users';
import type { ApiError } from '@/service/ApiError';
import type { IListUsersService } from '@/service/IUserService';
import { usersQueryKeys } from './usersQueryKeys';

/** Everyone at once, for a select of people (it searches on the phone). */
export const usePeopleQuery = (
  service: IListUsersService,
  { onlyActive }: { onlyActive: boolean },
) =>
  useQuery<UsuarioCompleto[], ApiError>({
    queryKey: onlyActive ? usersQueryKeys.active : usersQueryKeys.everyone,
    queryFn: () =>
      fetchAllPages((page) => service.exec(onlyActive ? { ...page, ativo: true } : page)),
  });

/** "Maria Souza, Condômino", found also by the e-mail. */
export const personOption = (user: UsuarioCompleto) => ({
  value: user.id,
  label: `${user.nome}, ${perfilLabel(user.perfil)}`,
  description: user.email,
});
