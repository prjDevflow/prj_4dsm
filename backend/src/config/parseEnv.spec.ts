import { describe, it, expect } from 'vitest';
import { parseEnv, InvalidEnvError } from './parseEnv';

const validSource = {
  CORS_ORIGINS: 'http://localhost:8081',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  JWT_SECRET: 'segredo-de-teste-com-mais-de-32-caracteres',
};

const without = (key: keyof typeof validSource) =>
  Object.fromEntries(Object.entries(validSource).filter(([name]) => name !== key));

describe('parseEnv', () => {
  it('deve falhar com mensagem clara quando falta CORS_ORIGINS', () => {
    const error = (() => {
      try {
        parseEnv({});
      } catch (e) {
        return e;
      }
    })();

    expect(error).toBeInstanceOf(InvalidEnvError);
    expect((error as Error).message).toContain('CORS_ORIGINS: obrigatória');
  });

  it('deve tratar variável vazia como ausente', () => {
    expect(() => parseEnv({ CORS_ORIGINS: '' })).toThrow('CORS_ORIGINS: obrigatória');
  });

  it('deve aplicar os padrões quando as variáveis opcionais faltam', () => {
    const env = parseEnv(validSource);

    expect(env).toMatchObject({ PORT: 3000, NODE_ENV: 'development', LOG_LEVEL: 'info' });
  });

  it('deve converter PORT para número', () => {
    const env = parseEnv({ ...validSource, PORT: '8080' });

    expect(env.PORT).toBe(8080);
  });

  it('deve rejeitar PORT que não é um número inteiro válido', () => {
    expect(() => parseEnv({ ...validSource, PORT: 'abc' })).toThrow(/PORT/);
  });

  it('deve rejeitar NODE_ENV fora da lista', () => {
    expect(() => parseEnv({ ...validSource, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it('deve separar CORS_ORIGINS por vírgula, sem espaços nem itens vazios', () => {
    const env = parseEnv({ ...validSource, CORS_ORIGINS: 'http://a.com, http://b.com ,' });

    expect(env.CORS_ORIGINS).toEqual(['http://a.com', 'http://b.com']);
  });

  it('deve falhar com mensagem clara quando falta DATABASE_URL', () => {
    expect(() => parseEnv(without('DATABASE_URL'))).toThrow('DATABASE_URL: obrigatória');
  });

  it('deve aceitar DATABASE_URL com postgresql:// ou postgres://', () => {
    expect(parseEnv(validSource).DATABASE_URL).toBe(validSource.DATABASE_URL);
    expect(parseEnv({ ...validSource, DATABASE_URL: 'postgres://u:p@h:5432/d' }).DATABASE_URL).toBe(
      'postgres://u:p@h:5432/d',
    );
  });

  it('deve rejeitar DATABASE_URL que não é uma URL PostgreSQL', () => {
    expect(() => parseEnv({ ...validSource, DATABASE_URL: 'mysql://u:p@h/d' })).toThrow(
      /DATABASE_URL: deve começar com postgresql:\/\//,
    );
  });

  it('não deve repetir o valor de DATABASE_URL na mensagem de erro', () => {
    const secret = 'mysql://usuario:segredo-123@h/d';

    expect(() => parseEnv({ ...validSource, DATABASE_URL: secret })).not.toThrow(/segredo-123/);
  });

  it('deve falhar com mensagem clara quando falta JWT_SECRET', () => {
    expect(() => parseEnv(without('JWT_SECRET'))).toThrow('JWT_SECRET: obrigatória');
  });

  it('deve rejeitar JWT_SECRET com menos de 32 caracteres sem repetir o valor', () => {
    const shortSecret = 'curto-demais-123';

    expect(() => parseEnv({ ...validSource, JWT_SECRET: shortSecret })).toThrow(
      'JWT_SECRET: deve ter no mínimo 32 caracteres',
    );
    expect(() => parseEnv({ ...validSource, JWT_SECRET: shortSecret })).not.toThrow(shortSecret);
  });

  it('deve aceitar JWT_SECRET com exatamente 32 caracteres', () => {
    expect(() => parseEnv({ ...validSource, JWT_SECRET: 'a'.repeat(32) })).not.toThrow();
  });

  it('deve usar 12h como padrão de JWT_EXPIRES_IN e convertê-lo para segundos', () => {
    expect(parseEnv(validSource).JWT_EXPIRES_IN).toBe(43200);
  });

  it.each([
    ['30s', 30],
    ['15m', 900],
    ['2h', 7200],
    ['7d', 604800],
  ])('deve converter JWT_EXPIRES_IN %s para %i segundos', (value, seconds) => {
    expect(parseEnv({ ...validSource, JWT_EXPIRES_IN: value }).JWT_EXPIRES_IN).toBe(seconds);
  });

  it.each(['12', 'abc', '0h', '-1h', '1.5h', '12 h'])(
    'deve rejeitar JWT_EXPIRES_IN inválido (%s)',
    (value) => {
      expect(() => parseEnv({ ...validSource, JWT_EXPIRES_IN: value })).toThrow(/JWT_EXPIRES_IN/);
    },
  );

  it('deve usar 10 como padrão de BCRYPT_COST e aceitar de 4 a 15', () => {
    expect(parseEnv(validSource).BCRYPT_COST).toBe(10);
    expect(parseEnv({ ...validSource, BCRYPT_COST: '4' }).BCRYPT_COST).toBe(4);
    expect(parseEnv({ ...validSource, BCRYPT_COST: '15' }).BCRYPT_COST).toBe(15);
  });

  it.each(['3', '16', 'abc', '10.5'])('deve rejeitar BCRYPT_COST inválido (%s)', (value) => {
    expect(() => parseEnv({ ...validSource, BCRYPT_COST: value })).toThrow(/BCRYPT_COST/);
  });

  it('deve usar 5 como padrão de LOGIN_MAX_PER_MINUTE e converter para número', () => {
    expect(parseEnv(validSource).LOGIN_MAX_PER_MINUTE).toBe(5);
    expect(parseEnv({ ...validSource, LOGIN_MAX_PER_MINUTE: '20' }).LOGIN_MAX_PER_MINUTE).toBe(20);
  });

  it.each(['0', '-1', 'abc', '2.5'])(
    'deve rejeitar LOGIN_MAX_PER_MINUTE inválido (%s)',
    (value) => {
      expect(() => parseEnv({ ...validSource, LOGIN_MAX_PER_MINUTE: value })).toThrow(
        /LOGIN_MAX_PER_MINUTE/,
      );
    },
  );
});
