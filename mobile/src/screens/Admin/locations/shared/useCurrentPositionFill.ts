import { useState } from 'react';
import { formatCoordinate } from '@/lib/coordinates';
import type { ICurrentPositionService } from '@/service/IDeviceService';

export const LOCATION_FAILED = 'Não foi possível obter a localização. Digite as coordenadas.';

/** "Usar minha localização atual": asks for the permission, reads the position and fills both fields. */
export const useCurrentPositionFill = (
  currentPositionService: ICurrentPositionService,
  fill: (latitude: string, longitude: string) => void,
) => {
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const onUseCurrentLocation = async () => {
    if (locating) return;
    setLocating(true);
    setLocationError(null);
    const position = await currentPositionService.exec();
    setLocating(false);
    if (!position) {
      setLocationError(LOCATION_FAILED);
      return;
    }
    fill(formatCoordinate(position.latitude), formatCoordinate(position.longitude));
  };

  return { locating, locationError, onUseCurrentLocation };
};
