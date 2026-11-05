import type { ListAuthorizationsParams } from '@/lib/types/authorizations';

type AuthorizationFilters = Omit<ListAuthorizationsParams, 'page' | 'pageSize'>;

// Everything under ['authorizations'] is refreshed after one is created.
export const authorizationsQueryKeys = {
  all: ['authorizations'] as const,
  lists: ['authorizations', 'list'] as const,
  list: (filters: AuthorizationFilters) => ['authorizations', 'list', filters] as const,
  detail: (id: string) => ['authorizations', 'detail', id] as const,
  /** T04 and the counter of T03 share this one. */
  mine: ['authorizations', 'mine'] as const,
};
