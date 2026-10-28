import { Writable } from 'node:stream';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createPino } from '../../src/infra/providers/PinoLogger';
import { createApp } from '../../src/main/app';
import { authenticateTerminal } from '../../src/main/middlewares';

// The real request log (pino-http), not a hand-made object: credentials must never reach it.
const makeLoggedApp = () => {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(String(chunk));
      callback();
    },
  });
  const app = createApp({
    logger: createPino('info', stream),
    extraRoutes: (router) => {
      router.get('/__test/terminal', authenticateTerminal, (req, res) => {
        res.json(req.terminal);
      });
    },
  });
  return { app, output: () => lines.join('') };
};

describe('log das requisições', () => {
  it('registra a requisição mas oculta a chave do terminal, o token e o cookie', async () => {
    const { app, output } = makeLoggedApp();

    await request(app)
      .get('/api/v1/__test/terminal')
      .set('X-Terminal-Id', '5eed0000-0000-4000-8000-000000000006')
      .set('X-Terminal-Key', 'chave-secreta-do-terminal')
      .set('Authorization', 'Bearer token-secreto')
      .set('Cookie', 'sessao=segredo');

    const text = output();
    expect(text).toContain('/api/v1/__test/terminal');
    expect(text).toContain('5eed0000-0000-4000-8000-000000000006');
    expect(text).toContain('[oculto]');
    expect(text).not.toContain('chave-secreta-do-terminal');
    expect(text).not.toContain('token-secreto');
    expect(text).not.toContain('sessao=segredo');
  });
});
