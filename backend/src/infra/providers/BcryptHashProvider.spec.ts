import { describe, expect, it } from 'vitest';
import { BcryptHashProvider } from './BcryptHashProvider';

// Cost 4 is the minimum, so the spec stays fast.
const makeSut = () => new BcryptHashProvider(4);

describe('BcryptHashProvider', () => {
  it('deve gerar um hash bcrypt que não contém a senha', async () => {
    const hash = await makeSut().hash('Senha-Valida-123');

    expect(hash).toMatch(/^\$2[aby]\$04\$/);
    expect(hash).not.toContain('Senha-Valida-123');
  });

  it('deve gerar hashes diferentes para a mesma senha (sal)', async () => {
    const sut = makeSut();

    expect(await sut.hash('Senha-Valida-123')).not.toBe(await sut.hash('Senha-Valida-123'));
  });

  it('deve confirmar a senha certa e recusar a errada', async () => {
    const sut = makeSut();
    const hash = await sut.hash('Senha-Valida-123');

    expect(await sut.compare('Senha-Valida-123', hash)).toBe(true);
    expect(await sut.compare('senha-valida-123', hash)).toBe(false);
  });

  it('deve recusar, sem lançar exceção, um hash malformado', async () => {
    expect(await makeSut().compare('Senha-Valida-123', 'isto-nao-e-um-hash')).toBe(false);
  });

  it('deve calcular o SHA-256 em hexadecimal', () => {
    // Known test vector of the SHA-256 specification (FIPS 180-4).
    expect(makeSut().sha256('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('deve confirmar o SHA-256 certo e recusar o errado, inclusive de outro tamanho', () => {
    const sut = makeSut();
    const hash = sut.sha256('chave-do-terminal');

    expect(sut.sha256Matches('chave-do-terminal', hash)).toBe(true);
    expect(sut.sha256Matches('chave-do-terminaL', hash)).toBe(false);
    expect(sut.sha256Matches('chave-do-terminal', hash.slice(0, 10))).toBe(false);
  });
});
