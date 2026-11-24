import { useMemo, useState } from 'react';
import { loadErrorMessage } from '@/lib/apiMessages';
import type { IListAccessPointsService, IListBuildingsService } from '@/service/ILocationService';
import type { IListTerminalsService } from '@/service/ITerminalService';
import { useAccessPointsQuery, useBuildingsQuery, useTerminalsQuery } from '../locationsQueries';

type LocationsListModelProps = {
  listBuildingsService: IListBuildingsService;
  listAccessPointsService: IListAccessPointsService;
  listTerminalsService: IListTerminalsService;
};

export type LocationsListStatus = 'loading' | 'error' | 'empty' | 'ready';

// T17: each building with its access points, and a summary of the terminals.
export const useLocationsListModel = ({
  listBuildingsService,
  listAccessPointsService,
  listTerminalsService,
}: LocationsListModelProps) => {
  const buildings = useBuildingsQuery(listBuildingsService);
  const accessPoints = useAccessPointsQuery(listAccessPointsService);
  const terminals = useTerminalsQuery(listTerminalsService);
  const [refreshing, setRefreshing] = useState(false);
  const queries = [buildings, accessPoints, terminals];

  const groups = useMemo(
    () =>
      (buildings.data ?? []).map((building) => ({
        building,
        points: (accessPoints.data ?? []).filter((ap) => ap.buildingId === building.id),
      })),
    [buildings.data, accessPoints.data],
  );

  const loaded = queries.every((query) => query.data);
  const error = queries.find((query) => query.error && !query.data)?.error;
  const status: LocationsListStatus = loaded
    ? groups.length === 0
      ? 'empty'
      : 'ready'
    : error
      ? 'error'
      : 'loading';

  // An inactive terminal is not "offline": nobody expects it to answer.
  const terminalCount = terminals.data?.length ?? 0;
  const offlineCount = terminals.data?.filter((t) => t.ativo && !t.online).length ?? 0;

  const refetchAll = () => Promise.all(queries.map((query) => query.refetch()));

  return {
    status,
    groups,
    terminalCount,
    offlineCount,
    errorMessage: error ? loadErrorMessage(error) : '',
    onRetry: () => refetchAll(),
    refreshing,
    onRefresh: async () => {
      setRefreshing(true);
      try {
        await refetchAll();
      } finally {
        setRefreshing(false);
      }
    },
  };
};
