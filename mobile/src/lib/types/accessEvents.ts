import type { Perfil } from './auth';
import type { TipoPonto } from './locations';

// EventoDeAcesso of backend/openapi.yaml (B18). Read-only: events are never edited.

export type MetodoAcesso = 'QR' | 'NFC';
export type ResultadoAcesso = 'AUTORIZADO' | 'NEGADO';

export interface EventoDeAcesso {
  id: string;
  /** UTC instant; for TERMINAL_OFFLINE it is the terminal's clock. */
  ocorridoEm: string;
  metodo: MetodoAcesso;
  resultado: ResultadoAcesso;
  /** Denial code (section 4.4 of the contract); null when AUTORIZADO. */
  motivo: string | null;
  /** Only on QR: approved and DISTANTE_DO_TERMINAL. */
  distanciaM: number | null;
  authorizationId: string | null;
  /** null when the attempt identified nobody (an unknown NFC tag). */
  usuario: { id: string; nome: string; perfil: Perfil } | null;
  local: {
    id: string;
    nome: string;
    tipo: TipoPonto;
    edificio: { id: string; nome: string };
  } | null;
  terminal: { id: string; nome: string } | null;
}

export type AccessEventFilters = {
  accessPointId?: string;
  terminalId?: string;
  metodo?: MetodoAcesso;
  resultado?: ResultadoAcesso;
  motivo?: string;
  /** ISO 8601 instant with offset; both limits are inclusive. */
  de?: string;
  ate?: string;
};

export type ListMyAccessEventsParams = AccessEventFilters & { page: number; pageSize: number };

export type ListAccessEventsParams = ListMyAccessEventsParams & { usuarioId?: string };
