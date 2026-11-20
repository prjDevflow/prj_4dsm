import { isValidUid, maskUid, normalizeUid } from './nfcUid';

describe('normalizeUid (mesma regra do backend)', () => {
  it.each([
    ['04:a1:b2:c3', '04A1B2C3'],
    ['04-a1-b2-c3', '04A1B2C3'],
    ['04 A1 B2 C3', '04A1B2C3'],
    ['  4e7bbb06  ', '4E7BBB06'],
    ['04:A1-b2 c3', '04A1B2C3'],
  ])('"%s" vira "%s"', (typed, saved) => {
    expect(normalizeUid(typed)).toBe(saved);
  });
});

describe('isValidUid', () => {
  it.each(['04A1B2C3', '04A1B2C3D4E5F6A7B8C9'])('aceita %s (8 e 20 caracteres)', (uid) => {
    expect(isValidUid(uid)).toBe(true);
  });

  it.each([
    ['7 caracteres', '04A1B2C'],
    ['21 caracteres', '04A1B2C3D4E5F6A7B8C9D'],
    ['letra fora de A a F', '04A1B2G3'],
    ['vazio', ''],
  ])('recusa %s', (_, uid) => {
    expect(isValidUid(uid)).toBe(false);
  });
});

describe('maskUid', () => {
  it('mostra só o fim do código na lista', () => {
    expect(maskUid('04A1B2C3D4')).toBe('••••C3D4');
  });

  it('um código curto também fica parcial', () => {
    expect(maskUid('4E7BBB06')).toBe('••••BB06');
  });
});
