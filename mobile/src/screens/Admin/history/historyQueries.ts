import { keepPreviousData, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { loadErrorMessage } from '@/lib/apiMessages';
import type { EventoDeAcesso } from '@/lib/types/accessEvents';
import type { Page } from '@/lib/types/page';
import type { ApiError } from '@/service/ApiError';

export const PAGE_SIZE = 20;

export const accessEventsQueryKeys = {
  all: ['access-events'] as const,
  list: (params: object) => ['access-events', 'list', params] as const,
  mine: ['access-events', 'mine'] as const,
};

export type AccessEventsPages = InfiniteData<Page<EventoDeAcesso>>;

export type HistoryStatus = 'loading' | 'error' | 'empty' | 'ready';

/** One paginated history (T26 or T12): newest first, more pages at the end, pull to refresh. */
export const useAccessEventsList = (
  queryKey: readonly unknown[],
  load: (page: number) => Promise<Page<EventoDeAcesso>>,
) => {
  const [refreshing, setRefreshing] = useState(false);
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => load(pageParam),
    initialPageParam: 1,
    getNextPageParam: ({ page, pageSize, total }) =>
      page * pageSize < total ? page + 1 : undefined,
    // While a new filter loads, the previous list stays on screen instead of a spinner.
    placeholderData: keepPreviousData,
  });

  const events = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data]);

  const status: HistoryStatus = query.data
    ? events.length === 0
      ? 'empty'
      : 'ready'
    : query.isError
      ? 'error'
      : 'loading';

  return {
    events,
    status,
    errorMessage: query.error ? loadErrorMessage(query.error as ApiError) : '',
    onRetry: () => query.refetch(),
    refreshing,
    // A new attempt shows up as soon as the person pulls the list.
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
