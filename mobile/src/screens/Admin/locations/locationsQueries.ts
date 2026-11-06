import { useQuery } from '@tanstack/react-query';
import { fetchAllPages } from '@/lib/fetchAllPages';
import type { Edificio, PontoDeAcesso, TipoPonto, Terminal } from '@/lib/types/locations';
import type { IconName } from '@/components/Icon';
import type { ApiError } from '@/service/ApiError';
import type { IListAccessPointsService, IListBuildingsService } from '@/service/ILocationService';
import type { IListTerminalsService } from '@/service/ITerminalService';

// Everything under ['locations'] is refreshed after a building, place or terminal is saved.
export const locationsQueryKeys = {
  all: ['locations'] as const,
  buildings: ['locations', 'buildings'] as const,
  accessPoints: ['locations', 'accessPoints'] as const,
  terminals: ['locations', 'terminals'] as const,
  terminal: (id: string) => ['locations', 'terminals', id] as const,
};

// A condominium has few places: the screens load every page at once (100 per page).

export const useBuildingsQuery = (service: IListBuildingsService, enabled = true) =>
  useQuery<Edificio[], ApiError>({
    queryKey: locationsQueryKeys.buildings,
    queryFn: () => fetchAllPages((params) => service.exec(params)),
    enabled,
  });

export const useAccessPointsQuery = (service: IListAccessPointsService, enabled = true) =>
  useQuery<PontoDeAcesso[], ApiError>({
    queryKey: locationsQueryKeys.accessPoints,
    queryFn: () => fetchAllPages((params) => service.exec(params)),
    enabled,
  });

/** `refetchInterval` keeps "Online" and "Visto há" close to the heartbeat of the terminals. */
export const useTerminalsQuery = (service: IListTerminalsService, refetchInterval?: number) =>
  useQuery<Terminal[], ApiError>({
    queryKey: locationsQueryKeys.terminals,
    queryFn: () => fetchAllPages((params) => service.exec(params)),
    refetchInterval,
  });

export const tipoLabels: Record<TipoPonto, string> = {
  PORTARIA: 'Portaria',
  PORTA: 'Porta',
  CATRACA: 'Catraca',
};

export const tipoIcons: Record<TipoPonto, IconName> = {
  PORTARIA: 'support_agent',
  PORTA: 'door_front',
  CATRACA: 'login',
};

/** "Catraca Social, Edifício Central": how a place is named in lists and selects. */
export const placeLabel = (
  accessPointId: string,
  accessPoints: PontoDeAcesso[] | undefined,
  buildings: Edificio[] | undefined,
) => {
  const ap = accessPoints?.find((candidate) => candidate.id === accessPointId);
  if (!ap) return '';
  const building = buildings?.find((candidate) => candidate.id === ap.buildingId);
  return building ? `${ap.nome}, ${building.nome}` : ap.nome;
};
