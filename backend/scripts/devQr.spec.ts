import { describe, expect, it, vi } from 'vitest';
import { assertNotProduction, runDevQr, type DevQrDeps } from './devQr';

const makeDeps = (overrides: Partial<DevQrDeps> = {}) => {
  const out: string[] = [];
  const err: string[] = [];
  const issue = vi.fn(async () => ({
    payload: 'ACS1:q3F8k2Zr1pLw9XbTn0YhVA',
    expiraEm: '2026-10-20T14:32:22.000Z',
  }));
  const deps: DevQrDeps = {
    nodeEnv: 'development',
    terminalId: 'terminal-de-dev',
    issue,
    out: (text) => out.push(text),
    err: (text) => err.push(text),
    ...overrides,
  };
  return { deps, out, err, issue };
};

describe('dev:qr', () => {
  it('deve recusar NODE_ENV=production sem emitir nenhum QR', async () => {
    const { deps, out, issue } = makeDeps({ nodeEnv: 'production' });

    await expect(runDevQr(deps)).rejects.toThrow(/production/);

    expect(issue).not.toHaveBeenCalled();
    expect(out).toEqual([]);
  });

  it.each(['development', 'test', undefined])('deve aceitar NODE_ENV=%s', (nodeEnv) => {
    expect(() => assertNotProduction(nodeEnv)).not.toThrow();
  });

  it('deve recusar production também na checagem isolada', () => {
    expect(() => assertNotProduction('production')).toThrow(/production/);
  });

  it('deve emitir para o terminal indicado e imprimir só o payload na saída padrão', async () => {
    const { deps, out, issue } = makeDeps();

    await runDevQr(deps);

    expect(issue).toHaveBeenCalledWith('terminal-de-dev');
    expect(out).toEqual(['ACS1:q3F8k2Zr1pLw9XbTn0YhVA\n']);
  });

  it('deve avisar até quando o QR vale na saída de erro, sem repetir o payload', async () => {
    const { deps, err } = makeDeps();

    await runDevQr(deps);

    expect(err.join('')).toContain('2026-10-20T14:32:22.000Z');
    expect(err.join('')).not.toContain('ACS1:');
  });

  it('deve deixar o erro do use case subir (por exemplo o 429 de um pedido antes de 5 s)', async () => {
    const { deps, out } = makeDeps({
      issue: async () => {
        throw new Error('QR Code pedido com muita frequência');
      },
    });

    await expect(runDevQr(deps)).rejects.toThrow(/muita frequência/);
    expect(out).toEqual([]);
  });
});
