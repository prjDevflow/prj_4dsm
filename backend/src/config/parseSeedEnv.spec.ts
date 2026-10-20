import { describe, it, expect } from 'vitest';
import { InvalidEnvError } from './parseEnv';
import { parseSeedEnv } from './parseSeedEnv';

const validSource = {
  SEED_ADMIN_EMAIL: 'admin@dev.local',
  SEED_ADMIN_PASSWORD: 'senha-do-admin-1',
  SEED_USER_PASSWORD: 'senha-dos-usuarios-1',
  SEED_TERMINAL_KEY: 'chave-de-desenvolvimento-do-terminal-0001',
};

const errorOf = (source: Record<string, string | undefined>) => {
  try {
    parseSeedEnv(source);
  } catch (e) {
    return e as Error;
  }
  return undefined;
};

describe('parseSeedEnv', () => {
  it('deve aplicar os padrões de localização, custo do bcrypt e ambiente', () => {
    const env = parseSeedEnv(validSource);

    expect(env).toMatchObject({
      NODE_ENV: 'development',
      SEED_LATITUDE: -23.30512,
      SEED_LONGITUDE: -45.96551,
      BCRYPT_COST: 10,
      SEED_ALLOW_PRODUCTION: false,
    });
  });

  it('deve falhar com mensagem clara e InvalidEnvError quando falta uma variável obrigatória', () => {
    const error = errorOf({});

    expect(error).toBeInstanceOf(InvalidEnvError);
    expect(error?.message).toContain('SEED_ADMIN_EMAIL: obrigatória');
    expect(error?.message).toContain('SEED_ADMIN_PASSWORD: obrigatória');
    expect(error?.message).toContain('SEED_USER_PASSWORD: obrigatória');
    expect(error?.message).toContain('SEED_TERMINAL_KEY: obrigatória');
  });

  it('deve tratar variável vazia como ausente', () => {
    expect(() => parseSeedEnv({ ...validSource, SEED_ADMIN_PASSWORD: '' })).toThrow(
      'SEED_ADMIN_PASSWORD: obrigatória',
    );
  });

  it('deve normalizar o e-mail do administrador para minúsculas e sem espaços', () => {
    const env = parseSeedEnv({ ...validSource, SEED_ADMIN_EMAIL: '  Admin@Dev.Local ' });

    expect(env.SEED_ADMIN_EMAIL).toBe('admin@dev.local');
  });

  it('deve rejeitar um e-mail inválido', () => {
    expect(() => parseSeedEnv({ ...validSource, SEED_ADMIN_EMAIL: 'sem-arroba' })).toThrow(
      /SEED_ADMIN_EMAIL/,
    );
  });

  it.each([
    ['curta demais (7)', 'a'.repeat(7)],
    ['longa demais para o bcrypt (73)', 'a'.repeat(73)],
  ])('deve rejeitar senha do administrador %s', (_nome, senha) => {
    expect(() => parseSeedEnv({ ...validSource, SEED_ADMIN_PASSWORD: senha })).toThrow(
      'SEED_ADMIN_PASSWORD: deve ter de 8 a 72 caracteres',
    );
  });

  it('deve aceitar senhas com 8 e com 72 caracteres', () => {
    expect(
      parseSeedEnv({ ...validSource, SEED_ADMIN_PASSWORD: 'a'.repeat(8) }).SEED_ADMIN_PASSWORD,
    ).toHaveLength(8);
    expect(
      parseSeedEnv({ ...validSource, SEED_USER_PASSWORD: 'a'.repeat(72) }).SEED_USER_PASSWORD,
    ).toHaveLength(72);
  });

  it('deve rejeitar chave do terminal com menos de 32 caracteres', () => {
    expect(() => parseSeedEnv({ ...validSource, SEED_TERMINAL_KEY: 'a'.repeat(31) })).toThrow(
      'SEED_TERMINAL_KEY: deve ter pelo menos 32 caracteres',
    );
  });

  it('deve converter latitude e longitude para número', () => {
    const env = parseSeedEnv({ ...validSource, SEED_LATITUDE: '-1.5', SEED_LONGITUDE: '2.5' });

    expect(env).toMatchObject({ SEED_LATITUDE: -1.5, SEED_LONGITUDE: 2.5 });
  });

  it.each([
    ['SEED_LATITUDE', '90.1'],
    ['SEED_LATITUDE', 'abc'],
    ['SEED_LONGITUDE', '-180.1'],
  ])('deve rejeitar %s inválida (%s)', (nome, valor) => {
    expect(() => parseSeedEnv({ ...validSource, [nome]: valor })).toThrow(nome);
  });

  it.each(['3', '16', '10.5', 'x'])('deve rejeitar BCRYPT_COST %s', (cost) => {
    expect(() => parseSeedEnv({ ...validSource, BCRYPT_COST: cost })).toThrow(/BCRYPT_COST/);
  });

  it('deve aceitar BCRYPT_COST nos limites 4 e 15', () => {
    expect(parseSeedEnv({ ...validSource, BCRYPT_COST: '4' }).BCRYPT_COST).toBe(4);
    expect(parseSeedEnv({ ...validSource, BCRYPT_COST: '15' }).BCRYPT_COST).toBe(15);
  });

  describe('trava de produção', () => {
    it('deve recusar NODE_ENV=production sem SEED_ALLOW_PRODUCTION', () => {
      expect(() => parseSeedEnv({ ...validSource, NODE_ENV: 'production' })).toThrow(
        'SEED_ALLOW_PRODUCTION: o seed é recusado com NODE_ENV=production',
      );
    });

    it('deve recusar NODE_ENV=production com SEED_ALLOW_PRODUCTION diferente de true', () => {
      expect(() =>
        parseSeedEnv({ ...validSource, NODE_ENV: 'production', SEED_ALLOW_PRODUCTION: 'false' }),
      ).toThrow('SEED_ALLOW_PRODUCTION');
    });

    it('deve aceitar NODE_ENV=production quando SEED_ALLOW_PRODUCTION=true', () => {
      const env = parseSeedEnv({
        ...validSource,
        NODE_ENV: 'production',
        SEED_ALLOW_PRODUCTION: 'true',
      });

      expect(env).toMatchObject({ NODE_ENV: 'production', SEED_ALLOW_PRODUCTION: true });
    });

    it('não deve exigir SEED_ALLOW_PRODUCTION fora de produção', () => {
      expect(() => parseSeedEnv({ ...validSource, NODE_ENV: 'test' })).not.toThrow();
    });
  });

  it('não deve repetir senhas nem a chave nas mensagens de erro', () => {
    const error = errorOf({
      ...validSource,
      SEED_ADMIN_EMAIL: 'inválido',
      SEED_ADMIN_PASSWORD: 'curta',
      SEED_TERMINAL_KEY: 'chave-secreta-curta',
    });

    expect(error?.message).toBeDefined();
    expect(error?.message).not.toContain('curta');
    expect(error?.message).not.toContain('chave-secreta');
    expect(error?.message).not.toContain('inválido');
  });
});
