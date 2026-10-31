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
  _terminal: Pick<Terminal, 'gpsFix' | 'ultimoContatoEm' | 'ultimaLat' | 'ultimaLon'>,
  _accessPoint: Pick<AccessPoint, 'latitude' | 'longitude'>,
  _now: Date,
  _config: ReferencePositionConfig,
): ReferencePosition | null {
  return null;
}
