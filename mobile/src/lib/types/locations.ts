// Edificio, PontoDeAcesso, Terminal and ChaveDoTerminal of backend/openapi.yaml (B07, B11).

export interface Edificio {
  id: string;
  nome: string;
  endereco: string;
  latitude: number;
  longitude: number;
  ativo: boolean;
}

export type TipoPonto = 'PORTARIA' | 'PORTA' | 'CATRACA';

export interface PontoDeAcesso {
  id: string;
  buildingId: string;
  tipo: TipoPonto;
  nome: string;
  identificacao: string;
  latitude: number;
  longitude: number;
  ativo: boolean;
}

export interface Terminal {
  id: string;
  accessPointId: string;
  nome: string;
  ativo: boolean;
  /** Last contact less than 30 s ago (TERMINAL_ONLINE_WINDOW_S on the server). */
  online: boolean;
  ultimoContatoEm: string | null;
  ultimaLat: number | null;
  ultimaLon: number | null;
  gpsFix: boolean;
  gpsSimulado: boolean;
  firmware: string | null;
  rssi: number | null;
}

/** POST /terminals and POST /terminals/:id/rotate-key: the key is only in this answer. */
export interface ChaveDoTerminal {
  id: string;
  apiKey: string;
}

export interface CreateBuildingBody {
  nome: string;
  endereco: string;
  latitude: number;
  longitude: number;
  ativo: boolean;
}

export type UpdateBuildingBody = Partial<CreateBuildingBody>;

export interface CreateAccessPointBody {
  buildingId: string;
  tipo: TipoPonto;
  nome: string;
  identificacao: string;
  latitude: number;
  longitude: number;
  ativo: boolean;
}

/** The building of an access point never changes (the API answers 422). */
export type UpdateAccessPointBody = Partial<Omit<CreateAccessPointBody, 'buildingId'>>;

export interface CreateTerminalBody {
  accessPointId: string;
  nome: string;
}

/** Only the name and the active switch change; the access point and the key do not. */
export type UpdateTerminalBody = Partial<{ nome: string; ativo: boolean }>;

export type ListParams = { page: number; pageSize: number };
