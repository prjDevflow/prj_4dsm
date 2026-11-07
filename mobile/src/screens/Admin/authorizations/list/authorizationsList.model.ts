import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { loadErrorMessage } from '@/lib/apiMessages';
import type { SituacaoEfetiva } from '@/lib/types/authorizations';
import type { ApiError } from '@/service/ApiError';
import type { IListAuthorizationsService } from '@/service/IAuthorizationService';
import type { IListAccessPointsService, IListBuildingsService } from '@/service/ILocationService';
import type { IListUsersService } from '@/service/IUserService';
import {
  placeOptions,
  useAccessPointsQuery,
  useBuildingsQuery,
} from '../../locations/locationsQueries';
import { personOption, usePeopleQuery } from '../../users/usersQueries';
import { authorizationsQueryKeys } from '../authorizationsQueries';

export type SituacaoFilter = 'TODAS' | SituacaoEfetiva;

export type AuthorizationsListStatus = 'loading' | 'error' | 'empty' | 'ready';

const PAGE_SIZE = 20;

type Filters = {
  usuarioId: string | null;
  accessPointId: string | null;
  situacao: SituacaoFilter;
  dataDe: string | null;
  dataAte: string | null;
};

const noFilters: Filters = {
  usuarioId: null,
  accessPointId: null,
  situacao: 'TODAS',
  dataDe: null,
  dataAte: null,
};

type AuthorizationsListModelProps = {
  listAuthorizationsService: IListAuthorizationsService;
  listUsersService: IListUsersService;
  listBuildingsService: IListBuildingsService;
  listAccessPointsService: IListAccessPointsService;
};

// T23: each filter is one parameter of the same query; pages load at the end of the list.
export const useAuthorizationsListModel = ({
  listAuthorizationsService,
  listUsersService,
  listBuildingsService,
  listAccessPointsService,
}: AuthorizationsListModelProps) => {
  const [filters, setFilters] = useState(noFilters);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Old authorizations belong to people and places that may be inactive today: all are offered.
  const people = usePeopleQuery(listUsersService, { onlyActive: false });
  const buildings = useBuildingsQuery(listBuildingsService);
  const accessPoints = useAccessPointsQuery(listAccessPointsService);

  const params = useMemo(
    () => ({
      usuarioId: filters.usuarioId ?? undefined,
      accessPointId: filters.accessPointId ?? undefined,
      situacao: filters.situacao === 'TODAS' ? undefined : filters.situacao,
      dataDe: filters.dataDe ?? undefined,
      dataAte: filters.dataAte ?? undefined,
    }),
    [filters],
  );

  const query = useInfiniteQuery({
    queryKey: authorizationsQueryKeys.list(params),
    queryFn: ({ pageParam }) =>
      listAuthorizationsService.exec({ ...params, page: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: ({ page, pageSize, total }) =>
      page * pageSize < total ? page + 1 : undefined,
    // While a new filter loads, the previous list stays on screen instead of a spinner.
    placeholderData: keepPreviousData,
  });

  const authorizations = useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data],
  );

  const status: AuthorizationsListStatus = query.data
    ? authorizations.length === 0
      ? 'empty'
      : 'ready'
    : query.isError
      ? 'error'
      : 'loading';

  const change =
    <K extends keyof Filters>(key: K) =>
    (value: Filters[K]) =>
      setFilters((current) => ({ ...current, [key]: value }));

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
    ...filters,
    periodOpen,
    hasFilters: Object.values(params).some((value) => value !== undefined),
    onChangePessoa: change('usuarioId'),
    onChangeLocal: change('accessPointId'),
    onChangeSituacao: change('situacao'),
    onChangeDataDe: change('dataDe'),
    onChangeDataAte: change('dataAte'),
    onTogglePeriod: () => setPeriodOpen((open) => !open),
    onClearFilters: () => {
      setFilters(noFilters);
      setPeriodOpen(false);
    },
    personOptions: useMemo(() => (people.data ?? []).map(personOption), [people.data]),
    placeOptions: useMemo(
      () => placeOptions(accessPoints.data ?? [], buildings.data ?? []),
      [accessPoints.data, buildings.data],
    ),
    authorizations,
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
