import { describe, expect, it } from 'vitest';
import { isWithinOfflineWindow } from './isWithinOfflineWindow';

const now = new Date('2026-10-20T14:00:00Z');

describe('isWithinOfflineWindow', () => {
  it('deve aceitar um evento do instante atual', () => {
    expect(isWithinOfflineWindow(now, now)).toBe(true);
  });

  it.todo('deve aceitar um evento 5 minutos no futuro e recusar com 1 ms a mais');
  it.todo('deve recusar um evento 6 minutos no futuro');
  it.todo('deve aceitar um evento 7 dias no passado e recusar com 1 ms a mais');
  it.todo('deve recusar um evento 8 dias no passado');
});
