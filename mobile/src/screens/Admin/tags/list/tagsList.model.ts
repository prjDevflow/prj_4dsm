import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { loadErrorMessage } from '@/lib/apiMessages';
import type { ApiError } from '@/service/ApiError';
import type { IListNfcTagsService } from '@/service/INfcTagService';
import type { IListUsersService } from '@/service/IUserService';
import { personOption, usePeopleQuery } from '../../users/usersQueries';
import { UNKNOWN_PERSON } from '../tags.messages';
import { nfcTagsQueryKeys, PAGE_SIZE } from '../tagsQueries';

export type TagsListStatus = 'loading' | 'error' | 'empty' | 'ready';

type TagsListModelProps = {
  listNfcTagsService: IListNfcTagsService;
  listUsersService: IListUsersService;
};

// T28: the API brings only `usuarioId`, so the names come from the list of people.
export const useTagsListModel = ({ listNfcTagsService, listUsersService }: TagsListModelProps) => {
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Tags of people who were deactivated stay in the list, with their names.
  const people = usePeopleQuery(listUsersService, { onlyActive: false });

  const params = useMemo(() => ({ usuarioId: usuarioId ?? undefined }), [usuarioId]);

  const query = useInfiniteQuery({
    queryKey: nfcTagsQueryKeys.list(params),
    queryFn: ({ pageParam }) =>
      listNfcTagsService.exec({ ...params, page: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: ({ page, pageSize, total }) =>
      page * pageSize < total ? page + 1 : undefined,
    placeholderData: keepPreviousData,
  });

  const names = useMemo(
    () => new Map((people.data ?? []).map((person) => [person.id, person.nome])),
    [people.data],
  );

  const items = useMemo(
    () =>
      (query.data?.pages.flatMap((page) => page.data) ?? []).map((tag) => ({
        tag,
        pessoa: names.get(tag.usuarioId) ?? (people.data ? UNKNOWN_PERSON : ''),
      })),
    [query.data, names, people.data],
  );

  const status: TagsListStatus = query.data
    ? items.length === 0
      ? 'empty'
      : 'ready'
    : query.isError
      ? 'error'
      : 'loading';

  return {
    usuarioId,
    hasFilters: usuarioId !== null,
    onChangePessoa: setUsuarioId,
    onClearFilters: () => setUsuarioId(null),
    personOptions: useMemo(() => (people.data ?? []).map(personOption), [people.data]),
    items,
    status,
    errorMessage: query.error ? loadErrorMessage(query.error as ApiError) : '',
    onRetry: () => query.refetch(),
    refreshing,
    onRefresh: async () => {
      setRefreshing(true);
      try {
        await query.refetch();
      } finally {
        setRefreshing(false);
      }
    },
    onEndReached: () => {
      if (query.hasNextPage && !query.isFetching && !query.isFetchNextPageError) {
        void query.fetchNextPage();
      }
    },
    loadingMore: query.isFetchingNextPage,
    loadMoreFailed: query.isFetchNextPageError,
    onRetryLoadMore: () => query.fetchNextPage(),
  };
};
