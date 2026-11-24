import { describe, expect, it } from 'vitest';
import { isWithinOfflineWindow } from './isWithinOfflineWindow';

const now = new Date('2026-10-20T14:00:00Z');
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const at = (offsetMs: number) => new Date(now.getTime() + offsetMs);

describe('isWithinOfflineWindow', () => {
  it('deve aceitar um evento do instante atual', () => {
    expect(isWithinOfflineWindow(now, now)).toBe(true);
  });

  it('deve aceitar um evento 5 minutos no futuro e recusar com 1 ms a mais', () => {
    expect(isWithinOfflineWindow(at(5 * MINUTE), now)).toBe(true);
    expect(isWithinOfflineWindow(at(5 * MINUTE + 1), now)).toBe(false);
  });

  it('deve recusar um evento 6 minutos no futuro', () => {
    expect(isWithinOfflineWindow(at(6 * MINUTE), now)).toBe(false);
  });

  it('deve aceitar um evento 7 dias no passado e recusar com 1 ms a mais', () => {
    expect(isWithinOfflineWindow(at(-7 * DAY), now)).toBe(true);
    expect(isWithinOfflineWindow(at(-7 * DAY - 1), now)).toBe(false);
  });

  it('deve recusar um evento 8 dias no passado', () => {
    expect(isWithinOfflineWindow(at(-8 * DAY), now)).toBe(false);
  });
});
