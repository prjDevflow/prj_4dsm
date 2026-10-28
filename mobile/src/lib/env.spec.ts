import { parseEnv } from './env';

describe('parseEnv', () => {
  it('falha com mensagem clara sem EXPO_PUBLIC_API_URL', () => {
    expect(() => parseEnv({})).toThrow(
      'EXPO_PUBLIC_API_URL não definida. Crie o mobile/.env a partir do .env.example.',
    );
    expect(() => parseEnv({ EXPO_PUBLIC_API_URL: '  ' })).toThrow(
      'EXPO_PUBLIC_API_URL não definida',
    );
  });

  it('falha quando a URL não é http(s) ou não termina em /api/v1', () => {
    const message =
      'EXPO_PUBLIC_API_URL inválida: use http:// ou https:// e termine em /api/v1 (exemplo: http://192.168.0.15:3000/api/v1).';

    expect(() => parseEnv({ EXPO_PUBLIC_API_URL: 'http://192.168.0.15:3000' })).toThrow(message);
    expect(() => parseEnv({ EXPO_PUBLIC_API_URL: '192.168.0.15:3000/api/v1' })).toThrow(message);
    expect(() => parseEnv({ EXPO_PUBLIC_API_URL: 'ftp://host/api/v1' })).toThrow(message);
  });

  it('aceita a URL com espaços nas pontas ou barra final e devolve sem a barra', () => {
    expect(parseEnv({ EXPO_PUBLIC_API_URL: ' http://192.168.0.15:4010/api/v1/ ' }).apiUrl).toBe(
      'http://192.168.0.15:4010/api/v1',
    );
    expect(parseEnv({ EXPO_PUBLIC_API_URL: 'https://api.exemplo.com/api/v1' }).apiUrl).toBe(
      'https://api.exemplo.com/api/v1',
    );
  });

  it('lê a lista de serviços falsos separada por vírgula', () => {
    const env = parseEnv({
      EXPO_PUBLIC_API_URL: 'http://localhost:3000/api/v1',
      EXPO_PUBLIC_FAKE_SERVICES: ' getHealth, validateQr ,,',
    });

    expect(env.fakeServices).toEqual(['getHealth', 'validateQr']);
  });

  it('sem lista ou com lista vazia, nenhum serviço é falso', () => {
    const url = { EXPO_PUBLIC_API_URL: 'http://localhost:3000/api/v1' };

    expect(parseEnv(url).fakeServices).toEqual([]);
    expect(parseEnv({ ...url, EXPO_PUBLIC_FAKE_SERVICES: '' }).fakeServices).toEqual([]);
  });
});
