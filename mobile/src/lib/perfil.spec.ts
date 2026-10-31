import { firstName, perfilLabel } from './perfil';

describe('perfil', () => {
  it.each([
    ['ADMIN', 'Administrador'],
    ['CONDOMINO', 'Condômino'],
    ['VISITANTE', 'Visitante'],
  ] as const)('%s aparece como "%s"', (perfil, label) => {
    expect(perfilLabel(perfil)).toBe(label);
  });

  it.each([
    ['Maria Souza', 'Maria'],
    ['  João  Pereira ', 'João'],
    ['Administrador (dev)', 'Administrador'],
    ['Ana', 'Ana'],
  ])('o primeiro nome de "%s" é "%s"', (nome, primeiro) => {
    expect(firstName(nome)).toBe(primeiro);
  });
});
