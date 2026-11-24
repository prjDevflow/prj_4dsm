import { seenAgo } from './seenAgo';

const now = new Date('2026-11-02T15:00:00.000Z');
const before = (ms: number) => new Date(now.getTime() - ms).toISOString();
const MIN = 60_000;

describe('seenAgo', () => {
  it('sem contato: "Nunca conectado"', () => {
    expect(seenAgo(null, now)).toBe('Nunca conectado');
  });

  it('menos de 1 minuto: "Visto agora"', () => {
    expect(seenAgo(before(59_000), now)).toBe('Visto agora');
    // A server clock a little ahead never gives a negative time.
    expect(seenAgo(before(-5_000), now)).toBe('Visto agora');
  });

  it('minutos, horas e dias, como no Figma', () => {
    expect(seenAgo(before(MIN), now)).toBe('Visto há 1 min');
    expect(seenAgo(before(12 * MIN), now)).toBe('Visto há 12 min');
    expect(seenAgo(before(59 * MIN + 59_000), now)).toBe('Visto há 59 min');
    expect(seenAgo(before(60 * MIN), now)).toBe('Visto há 1 h');
    expect(seenAgo(before(23 * 60 * MIN), now)).toBe('Visto há 23 h');
    expect(seenAgo(before(24 * 60 * MIN), now)).toBe('Visto há 1 dia');
    expect(seenAgo(before(9 * 24 * 60 * MIN), now)).toBe('Visto há 9 dias');
  });
});
