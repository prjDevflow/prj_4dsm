import { useMemo, useState } from 'react';
import type { StatusBadgeProps } from '@/components/ui';
import { loadErrorMessage } from '@/lib/apiMessages';
import { formatCoordinate } from '@/lib/coordinates';
import { seenAgo } from '@/lib/seenAgo';
import type { Terminal } from '@/lib/types/locations';
import { useNow } from '@/lib/useNow';
import type { IListAccessPointsService, IListBuildingsService } from '@/service/ILocationService';
import type { IListTerminalsService } from '@/service/ITerminalService';
import {
  placeLabel,
  useAccessPointsQuery,
  useBuildingsQuery,
  useTerminalsQuery,
} from '../../locations/locationsQueries';

// The heartbeat of a terminal comes every few seconds; the list asks again every 15 s.
const REFRESH_MS = 15_000;

type TerminalsListModelProps = {
  listTerminalsService: IListTerminalsService;
  listAccessPointsService: IListAccessPointsService;
  listBuildingsService: IListBuildingsService;
  /** Tests fix the clock; the app uses the phone's. */
  now?: () => Date;
};

export type TerminalStatus = 'online' | 'offline' | 'inativo';

export const terminalStatus = (terminal: Terminal): TerminalStatus =>
  !terminal.ativo ? 'inativo' : terminal.online ? 'online' : 'offline';

export const statusBadge: Record<TerminalStatus, StatusBadgeProps> = {
  online: { status: 'ONLINE' },
  offline: { status: 'OFFLINE' },
  inativo: { status: 'INATIVO' },
};

/** "Visto há 12 min · -23,30512, -45,96551": last contact and, when there is one, the position. */
export const seenLine = (terminal: Terminal, now: Date) => {
  const seen = seenAgo(terminal.ultimoContatoEm, now);
  return terminal.ultimaLat !== null && terminal.ultimaLon !== null
    ? `${seen} · ${formatCoordinate(terminal.ultimaLat)}, ${formatCoordinate(terminal.ultimaLon)}`
    : seen;
};

// T20: every terminal with its place, status and last contact.
export const useTerminalsListModel = ({
  listTerminalsService,
  listAccessPointsService,
  listBuildingsService,
  now: clock,
}: TerminalsListModelProps) => {
  const terminals = useTerminalsQuery(listTerminalsService, REFRESH_MS);
  const accessPoints = useAccessPointsQuery(listAccessPointsService);
  const buildings = useBuildingsQuery(listBuildingsService);
  // The clock is read as often as the list is fetched, so "Visto há" never lags behind it.
  const now = useNow(clock, REFRESH_MS);
  const [refreshing, setRefreshing] = useState(false);
  const queries = [terminals, accessPoints, buildings];

  const items = useMemo(
    () =>
      (terminals.data ?? []).map((terminal) => ({
        terminal,
        status: terminalStatus(terminal),
        place: placeLabel(terminal.accessPointId, accessPoints.data, buildings.data),
        seen: seenLine(terminal, now),
      })),
    [terminals.data, accessPoints.data, buildings.data, now],
  );

  const loaded = queries.every((query) => query.data);
  const error = queries.find((query) => query.error && !query.data)?.error;
  const refetchAll = () => Promise.all(queries.map((query) => query.refetch()));

  return {
    items,
    status: loaded
      ? items.length === 0
        ? ('empty' as const)
        : ('ready' as const)
      : error
        ? ('error' as const)
        : ('loading' as const),
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
