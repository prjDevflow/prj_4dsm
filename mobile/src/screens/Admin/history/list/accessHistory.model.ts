import { useMemo, useState } from 'react';
import { accessReasonOptions, lastDays, periodInstants } from '@/lib/accessEvents';
import { formatIsoDate } from '@/lib/dateValue';
import type { MetodoAcesso, ResultadoAcesso } from '@/lib/types/accessEvents';
import type { IListAccessEventsService } from '@/service/IAccessEventService';
import type { IListAccessPointsService, IListBuildingsService } from '@/service/ILocationService';
import type { IListUsersService } from '@/service/IUserService';
import {
  placeOptions,
  useAccessPointsQuery,
  useBuildingsQuery,
} from '../../locations/locationsQueries';
import { personOption, usePeopleQuery } from '../../users/usersQueries';
import { accessEventsQueryKeys, PAGE_SIZE, useAccessEventsList } from '../historyQueries';

export type MetodoFilter = 'TODOS' | MetodoAcesso;
export type ResultadoFilter = 'TODOS' | ResultadoAcesso;

const DEFAULT_DAYS = 7;

type Filters = {
  usuarioId: string | null;
  accessPointId: string | null;
  metodo: MetodoFilter;
  resultado: ResultadoFilter;
  motivo: string | null;
  dataDe: string | null;
  dataAte: string | null;
};

type AccessHistoryModelProps = {
  listAccessEventsService: IListAccessEventsService;
  listUsersService: IListUsersService;
  listBuildingsService: IListBuildingsService;
  listAccessPointsService: IListAccessPointsService;
  /** The clock that defines "the last 7 days" (controlled in the tests). */
  now?: () => Date;
};

const shortDate = (isoDate: string) => formatIsoDate(isoDate).slice(0, 5);

// T26: each filter is one parameter of the same query; the period opens on the last 7 days.
export const useAccessHistoryModel = ({
  listAccessEventsService,
  listUsersService,
  listBuildingsService,
  listAccessPointsService,
  now = () => new Date(),
}: AccessHistoryModelProps) => {
  const [defaults] = useState<Filters>(() => ({
    usuarioId: null,
    accessPointId: null,
    metodo: 'TODOS',
    resultado: 'TODOS',
    motivo: null,
    ...lastDays(now(), DEFAULT_DAYS),
  }));
  const [filters, setFilters] = useState(defaults);
  const [periodOpen, setPeriodOpen] = useState(false);

  // Attempts of people and places that may be inactive today: all are offered.
  const people = usePeopleQuery(listUsersService, { onlyActive: false });
  const buildings = useBuildingsQuery(listBuildingsService);
  const accessPoints = useAccessPointsQuery(listAccessPointsService);

  const params = useMemo(
    () => ({
      usuarioId: filters.usuarioId ?? undefined,
      accessPointId: filters.accessPointId ?? undefined,
      metodo: filters.metodo === 'TODOS' ? undefined : filters.metodo,
      resultado: filters.resultado === 'TODOS' ? undefined : filters.resultado,
      motivo: filters.motivo ?? undefined,
      ...periodInstants(filters.dataDe, filters.dataAte),
    }),
    [filters],
  );

  const list = useAccessEventsList(accessEventsQueryKeys.list(params), (page) =>
    listAccessEventsService.exec({ ...params, page, pageSize: PAGE_SIZE }),
  );

  const isDefaultPeriod =
    filters.dataDe === defaults.dataDe && filters.dataAte === defaults.dataAte;
  const periodLabel = isDefaultPeriod
    ? 'Últimos 7 dias'
    : filters.dataDe && filters.dataAte
      ? `${shortDate(filters.dataDe)} a ${shortDate(filters.dataAte)}`
      : filters.dataDe
        ? `Desde ${shortDate(filters.dataDe)}`
        : filters.dataAte
          ? `Até ${shortDate(filters.dataAte)}`
          : 'Todo o período';

  const change =
    <K extends keyof Filters>(key: K) =>
    (value: Filters[K]) =>
      setFilters((current) => ({ ...current, [key]: value }));

  return {
    ...filters,
    periodOpen,
    periodLabel,
    isDefaultPeriod,
    hasFilters: (Object.keys(filters) as (keyof Filters)[]).some(
      (key) => filters[key] !== defaults[key],
    ),
    onChangePessoa: change('usuarioId'),
    onChangeLocal: change('accessPointId'),
    onChangeMetodo: change('metodo'),
    onChangeResultado: change('resultado'),
    onChangeMotivo: change('motivo'),
    onChangeDataDe: change('dataDe'),
    onChangeDataAte: change('dataAte'),
    onTogglePeriod: () => setPeriodOpen((open) => !open),
    onClearFilters: () => {
      setFilters(defaults);
      setPeriodOpen(false);
    },
    personOptions: useMemo(() => (people.data ?? []).map(personOption), [people.data]),
    placeOptions: useMemo(
      () => placeOptions(accessPoints.data ?? [], buildings.data ?? []),
      [accessPoints.data, buildings.data],
    ),
    reasonOptions: accessReasonOptions,
    ...list,
  };
};
