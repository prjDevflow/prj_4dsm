import type { ListUsersParams } from '@/lib/types/users';

type UsersFilters = Omit<ListUsersParams, 'page' | 'pageSize'>;

// Everything under ['users'] is refreshed after a user is created or changed.
export const usersQueryKeys = {
  all: ['users'] as const,
  active: ['users', 'active'] as const,
  everyone: ['users', 'everyone'] as const,
  list: (filters: UsersFilters) => ['users', 'list', filters] as const,
  detail: (id: string) => ['users', 'detail', id] as const,
};
