import { describe, expect, it } from 'vitest';
import { makeAccessPoint } from '../../../test/factories/makeAccessPoint';
import { makeTerminal } from '../../../test/factories/makeTerminal';
import { resolveReferencePosition } from './resolveReferencePosition';

const now = new Date('2026-10-20T14:00:00Z');
const secondsAgo = (s: number) => new Date(now.getTime() - s * 1000);

const accessPoint = makeAccessPoint({ latitude: -23.30512, longitude: -45.96551 });
const gps = { latitude: -23.3051, longitude: -45.9655 };

// Terminal with a GPS fix, last heard from `ageSeconds` ago, reporting the `gps` coordinates.
const terminalWithFix = (ageSeconds: number) =>
  makeTerminal({
    gpsFix: true,
    ultimoContatoEm: secondsAgo(ageSeconds),
    ultimaLat: gps.latitude,
    ultimaLon: gps.longitude,
  });

const fallback = { source: 'GPS_COM_FALLBACK', gpsMaxAgeMinutes: 10 } as const;

describe('resolveReferencePosition', () => {
  describe('GPS_COM_FALLBACK', () => {
    it('deve usar o GPS quando há fix e o contato é recente', () => {
      const result = resolveReferencePosition(terminalWithFix(30), accessPoint, now, fallback);

      expect(result).toEqual({ ...gps, origem: 'GPS' });
    });

    it.todo('deve cair nas coordenadas do ponto quando não há fix');
    it.todo('deve usar o GPS com 9 min 59 s e cair no ponto com exatamente 10 min');
    it.todo('deve cair nas coordenadas do ponto quando o terminal nunca fez contato');
    it.todo('deve cair nas coordenadas do ponto quando há fix mas faltam as coordenadas');
  });

  describe('CADASTRO', () => {
    it.todo('deve usar sempre as coordenadas do ponto, mesmo com GPS recente');
  });

  describe('GPS', () => {
    it.todo('deve usar o GPS quando há fix e o contato é recente');
    it.todo('deve devolver null quando não há fix');
    it.todo('deve devolver null quando o GPS é antigo (10 min ou mais)');
  });
});
