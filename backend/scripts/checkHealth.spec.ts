import { describe, expect, it, vi } from 'vitest';
import { checkHealth, type HealthFetch } from './checkHealth';

const URL_HEALTH = 'https://api.exemplo.test/api/v1/health';

const response = (status: number, body: unknown) => ({
  status,
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
});

const healthy = () => response(200, { status: 'ok', db: 'up', version: '0.1.0' });

const makeSut = (responses: (() => ReturnType<typeof response> | Promise<never>)[], attempts = 3) => {
  let call = 0;
  const fetch: HealthFetch = vi.fn(async () => {
    const next = responses[Math.min(call, responses.length - 1)];
    call += 1;
    return next!();
  });
  const sleep = vi.fn(async () => {});
  const log = vi.fn();
  const run = () => checkHealth({ url: URL_HEALTH, fetch, attempts, delayMs: 5_000, sleep, log });
  return { run, fetch, sleep, log };
};

describe('checkHealth', () => {
  it('deve passar na primeira tentativa quando o /health responde 200 com status ok e db up', async () => {
    const { run, fetch, sleep } = makeSut([healthy]);

    await expect(run()).resolves.toEqual({ ok: true, tentativas: 1 });
    expect(fetch).toHaveBeenCalledWith(URL_HEALTH);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('deve falhar quando o banco está fora (db down), mesmo com HTTP 200', async () => {
    const { run } = makeSut([() => response(200, { status: 'ok', db: 'down' })]);

    const result = await run();
    expect(result.ok).toBe(false);
    expect(result.motivo).toContain('db');
  });

  it('deve falhar quando o status HTTP não é 200', async () => {
    const { run } = makeSut([() => response(502, 'Bad Gateway')]);

    const result = await run();
    expect(result).toMatchObject({ ok: false, tentativas: 3 });
    expect(result.motivo).toContain('502');
  });

  it('deve falhar quando o corpo não é JSON', async () => {
    const { run } = makeSut([() => response(200, '<html>manutenção</html>')]);

    const result = await run();
    expect(result.ok).toBe(false);
    expect(result.motivo).toContain('JSON');
  });

  it('deve falhar quando o status do corpo não é ok', async () => {
    const { run } = makeSut([() => response(200, { status: 'degraded', db: 'up' })]);

    expect((await run()).ok).toBe(false);
  });

  it('deve tentar de novo, esperando entre as tentativas, e passar quando a nova versão sobe', async () => {
    const { run, fetch, sleep } = makeSut([
      () => Promise.reject(new Error('ECONNREFUSED')),
      () => response(200, { status: 'ok', db: 'down' }),
      healthy,
    ]);

    await expect(run()).resolves.toEqual({ ok: true, tentativas: 3 });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(5_000);
  });

  it('deve desistir depois do limite de tentativas e devolver o último motivo, sem esperar depois da última', async () => {
    const { run, fetch, sleep, log } = makeSut([() => Promise.reject(new Error('ECONNREFUSED'))], 4);

    const result = await run();
    expect(result).toEqual({ ok: false, tentativas: 4, motivo: 'falha de rede: ECONNREFUSED' });
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(sleep).toHaveBeenCalledTimes(3);
    expect(log).toHaveBeenCalledTimes(4);
  });

  it('deve recusar uma URL que não seja HTTPS, porque o critério da B10 é o /health por HTTPS', async () => {
    const fetch = vi.fn();
    await expect(
      checkHealth({
        url: 'http://api.exemplo.test/api/v1/health',
        fetch,
        attempts: 3,
        delayMs: 1,
        sleep: async () => {},
        log: () => {},
      }),
    ).rejects.toThrow('HTTPS');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('deve recusar um número de tentativas menor que 1', async () => {
    const { fetch } = makeSut([healthy]);
    await expect(
      checkHealth({ url: URL_HEALTH, fetch, attempts: 0, delayMs: 1, sleep: async () => {}, log: () => {} }),
    ).rejects.toThrow('tentativas');
  });
});
