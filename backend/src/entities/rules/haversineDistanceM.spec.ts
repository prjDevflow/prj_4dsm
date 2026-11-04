import { describe, expect, it } from 'vitest';
import { haversineDistanceM } from './haversineDistanceM';

// Posição da catraca de teste (seed) e pontos a 99 m ao norte e a 101 m a leste dela.
const TERMINAL = { latitude: -23.30512, longitude: -45.96551 };
const NORTH_99M = { latitude: -23.30422967, longitude: -45.96551 };
const EAST_101M = { latitude: -23.30512, longitude: -45.96452099 };

describe('haversineDistanceM', () => {
  it('deve medir um grau de latitude no meridiano como 111195 m (esfera de 6371 km)', () => {
    const distance = haversineDistanceM(
      { latitude: 0, longitude: 0 },
      { latitude: 1, longitude: 0 },
    );

    expect(distance).toBeCloseTo(111_194.93, 0);
  });

  it('deve medir meia volta ao longo do equador como metade da circunferência', () => {
    const distance = haversineDistanceM(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 180 },
    );

    expect(distance).toBeCloseTo(20_015_086.8, 0);
  });

  it('deve devolver 0 para o mesmo ponto', () => {
    expect(haversineDistanceM(TERMINAL, TERMINAL)).toBe(0);
  });

  it('deve dar a mesma distância nos dois sentidos', () => {
    const ab = haversineDistanceM(TERMINAL, NORTH_99M);
    const ba = haversineDistanceM(NORTH_99M, TERMINAL);

    expect(ab).toBeCloseTo(ba, 9);
  });

  it('deve medir 99 m para o ponto 99 m ao norte da catraca', () => {
    expect(haversineDistanceM(TERMINAL, NORTH_99M)).toBeCloseTo(99, 0);
  });

  it('deve medir 101 m para o ponto 101 m a leste da catraca', () => {
    expect(haversineDistanceM(TERMINAL, EAST_101M)).toBeCloseTo(101, 0);
  });

  it('deve medir corretamente atravessando o antimeridiano', () => {
    const distance = haversineDistanceM(
      { latitude: 0, longitude: 179.5 },
      { latitude: 0, longitude: -179.5 },
    );

    expect(distance).toBeCloseTo(111_194.93, 0);
  });
});
