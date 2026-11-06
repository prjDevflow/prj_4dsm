import { describe, expect, it } from 'vitest';
import { UuidGenerator } from './UuidGenerator';

describe('UuidGenerator', () => {
  it('deve gerar UUID v4 em texto e diferente a cada chamada', () => {
    const ids = new UuidGenerator();

    const a = ids.next();
    const b = ids.next();

    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a).not.toBe(b);
  });
});
