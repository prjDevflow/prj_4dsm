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
});
