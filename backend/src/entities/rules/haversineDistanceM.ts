export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** Great-circle distance between two points, in meters. */
export function haversineDistanceM(_a: GeoPoint, _b: GeoPoint): number {
  throw new Error('não implementado');
}
