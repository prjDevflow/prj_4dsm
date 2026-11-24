import { entriesLeft } from './entriesLeft';

describe('entriesLeft', () => {
  it.each([
    [0, 'Nenhuma entrada restante'],
    [1, 'Resta 1 entrada'],
    [2, 'Restam 2 entradas'],
    [99, 'Restam 99 entradas'],
  ])('%i entradas: %s', (entries, text) => {
    expect(entriesLeft(entries)).toBe(text);
  });
});
