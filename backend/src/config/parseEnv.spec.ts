import { describe, it, expect } from 'vitest';
import { parseEnv, InvalidEnvError } from './parseEnv';

const validSource = { CORS_ORIGINS: 'http://localhost:8081' };

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
    const env = parseEnv({ CORS_ORIGINS: 'http://a.com, http://b.com ,' });

    expect(env.CORS_ORIGINS).toEqual(['http://a.com', 'http://b.com']);
  });
});
