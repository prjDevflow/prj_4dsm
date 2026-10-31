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

/**
 * Where the terminal is, for the proximity check. Null only in `GPS` mode when there is no usable GPS:
 * the caller decides what that means (a denial is a value, not an exception).
 */
export function resolveReferencePosition(
  terminal: Pick<Terminal, 'gpsFix' | 'ultimoContatoEm' | 'ultimaLat' | 'ultimaLon'>,
  accessPoint: Pick<AccessPoint, 'latitude' | 'longitude'>,
  now: Date,
  config: ReferencePositionConfig,
): ReferencePosition | null {
  const gps = freshGps(terminal, now, config.gpsMaxAgeMinutes);
  const registered: ReferencePosition = {
    latitude: accessPoint.latitude,
    longitude: accessPoint.longitude,
    origem: 'CADASTRO',
  };

  switch (config.source) {
    case 'CADASTRO':
      return registered;
    case 'GPS':
      return gps;
    case 'GPS_COM_FALLBACK':
      return gps ?? registered;
  }
}

function freshGps(
  terminal: Pick<Terminal, 'gpsFix' | 'ultimoContatoEm' | 'ultimaLat' | 'ultimaLon'>,
  now: Date,
  maxAgeMinutes: number,
): ReferencePosition | null {
  const { gpsFix, ultimoContatoEm, ultimaLat, ultimaLon } = terminal;
  if (!gpsFix || ultimoContatoEm === null || ultimaLat === null || ultimaLon === null) return null;
  // Less than the limit is recent: a GPS reported exactly `maxAgeMinutes` ago is already old.
  const ageMs = now.getTime() - ultimoContatoEm.getTime();
  if (ageMs >= maxAgeMinutes * 60_000) return null;
  return { latitude: ultimaLat, longitude: ultimaLon, origem: 'GPS' };
}
