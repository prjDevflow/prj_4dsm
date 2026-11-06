import type { Terminal } from '../../entities/Terminal';
import { isTerminalOnline } from '../../entities/rules/isTerminalOnline';

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
  terminal: Terminal,
  now: Date,
  config: TerminalViewConfig,
): TerminalView => ({
  id: terminal.id,
  accessPointId: terminal.accessPointId,
  nome: terminal.nome,
  ativo: terminal.ativo,
  online: isTerminalOnline(terminal.ultimoContatoEm, now, config.onlineWindowSeconds),
  ultimoContatoEm: terminal.ultimoContatoEm,
  ultimaLat: terminal.ultimaLat,
  ultimaLon: terminal.ultimaLon,
  gpsFix: terminal.gpsFix,
  gpsSimulado: terminal.gpsSimulado,
  firmware: terminal.firmware,
  rssi: terminal.rssi,
});
