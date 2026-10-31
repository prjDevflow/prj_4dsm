import type { AccessPoint } from '../AccessPoint';
import type { Terminal } from '../Terminal';

export type PositionSource = 'GPS_COM_FALLBACK' | 'CADASTRO' | 'GPS';

export interface ReferencePositionConfig {
  source: PositionSource;
  /** `GPS_MAX_AGE_MIN`. */
  gpsMaxAgeMinutes: number;
}

export interface ReferencePosition {
  latitude: number;
  longitude: number;
  origem: 'GPS' | 'CADASTRO';
}

export function resolveReferencePosition(
  terminal: Pick<Terminal, 'gpsFix' | 'ultimoContatoEm' | 'ultimaLat' | 'ultimaLon'>,
  accessPoint: Pick<AccessPoint, 'latitude' | 'longitude'>,
  now: Date,
  config: ReferencePositionConfig,
): ReferencePosition | null {
  const { ultimoContatoEm, ultimaLat, ultimaLon } = terminal;
  // Less than the limit is recent: a GPS reported exactly `gpsMaxAgeMinutes` ago is already old.
  const gpsIsFresh =
    terminal.gpsFix &&
    ultimoContatoEm !== null &&
    ultimaLat !== null &&
    ultimaLon !== null &&
    now.getTime() - ultimoContatoEm.getTime() < config.gpsMaxAgeMinutes * 60_000;

  if (gpsIsFresh) return { latitude: ultimaLat, longitude: ultimaLon, origem: 'GPS' };
  return { latitude: accessPoint.latitude, longitude: accessPoint.longitude, origem: 'CADASTRO' };
}
