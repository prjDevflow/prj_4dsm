import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createPino } from './PinoLogger';

const capture = () => {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(String(chunk));
      callback();
    },
  });
  return { stream, output: () => lines.join('') };
};

describe('createPino', () => {
  it('deve ocultar a chave do terminal, o token e o cookie nos cabeçalhos registrados', () => {
    const { stream, output } = capture();
    const logger = createPino('info', stream);

    logger.info(
      {
        req: {
          headers: {
            'x-terminal-key': 'chave-secreta-do-terminal',
            'x-terminal-id': 'id-publico',
            authorization: 'Bearer token-secreto',
            cookie: 'sessao=segredo',
          },
        },
      },
      'requisição',
    );

    const text = output();
    expect(text).not.toContain('chave-secreta-do-terminal');
    expect(text).not.toContain('token-secreto');
    expect(text).not.toContain('sessao=segredo');
    expect(text).toContain('[oculto]');
    expect(text).toContain('id-publico');
  });
});
