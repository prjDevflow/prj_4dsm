import type { Terminal } from '../../entities/Terminal';

/** The terminal as the API exposes it: never the key hash, and with `online` worked out from the clock. */
export interface TerminalView {
  id: string;
  accessPointId: string;
  nome: string;
  ativo: boolean;
  online: boolean;
  ultimoContatoEm: Date | null;
  ultimaLat: number | null;
  ultimaLon: number | null;
  gpsFix: boolean;
  gpsSimulado: boolean;
  firmware: string | null;
  rssi: number | null;
}

export interface TerminalViewConfig {
  /** `TERMINAL_ONLINE_WINDOW_S`. */
  onlineWindowSeconds: number;
}

export const toTerminalView = (
  _terminal: Terminal,
  _now: Date,
  _config: TerminalViewConfig,
): TerminalView => {
  throw new Error('not implemented');
};
