import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { Perfil } from '@/lib/types/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import type { ApiError } from '@/service/ApiError';
import type { IListUsersService } from '@/service/IUserService';
import { loadErrorMessage } from '../users.messages';
import { usersQueryKeys } from '../usersQueryKeys';

export type PerfilFilter = 'TODOS' | Perfil;

export type UsersListStatus = 'loading' | 'error' | 'empty' | 'ready';

const PAGE_SIZE = 20;
const SEARCH_DELAY_MS = 400;

type UsersListModelProps = {
  listUsersService: IListUsersService;
};

// T15: search, profile filter and inactive users combine in one query; pages load at the end.
export const useUsersListModel = ({ listUsersService }: UsersListModelProps) => {
  const [search, setSearch] = useState('');
  const [perfil, setPerfil] = useState<PerfilFilter>('TODOS');
  const [showInactive, setShowInactive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const q = useDebouncedValue(search.trim(), SEARCH_DELAY_MS);

  const filters = useMemo(
    () => ({
      q: q || undefined,
      perfil: perfil === 'TODOS' ? undefined : perfil,
      // Off: only the active ones. On: everyone (no filter), so inactive users show up too.
      ativo: showInactive ? undefined : true,
    }),
    [q, perfil, showInactive],
  );

  const query = useInfiniteQuery({
    queryKey: usersQueryKeys.list(filters),
    queryFn: ({ pageParam }) =>
      listUsersService.exec({ ...filters, page: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: ({ page, pageSize, total }) =>
      page * pageSize < total ? page + 1 : undefined,
    // While a new search loads, the previous list stays on screen instead of a spinner.
    placeholderData: keepPreviousData,
  });

  const users = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data]);

  const status: UsersListStatus = query.data
    ? users.length === 0
      ? 'empty'
      : 'ready'
    : query.isError
      ? 'error'
      : 'loading';

  const onEndReached = () => {
    if (query.hasNextPage && !query.isFetching && !query.isFetchNextPageError) {
      void query.fetchNextPage();
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  return {
    search,
    onChangeSearch: setSearch,
    perfil,
    onChangePerfil: setPerfil,
    showInactive,
    onToggleInactive: setShowInactive,
    users,
    status,
    errorMessage: query.error ? loadErrorMessage(query.error as ApiError) : '',
    onRetry: () => query.refetch(),
    refreshing,
    onRefresh,
    onEndReached,
    loadingMore: query.isFetchingNextPage,
    loadMoreFailed: query.isFetchNextPageError,
    onRetryLoadMore: () => query.fetchNextPage(),
  };
};
