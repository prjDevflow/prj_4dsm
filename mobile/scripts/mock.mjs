// Mock of the API from backend/openapi.yaml, at the same /api/v1 prefix as the real API.
// Prism ignores the base path of `servers`, so this proxy strips /api/v1 before forwarding.
import { spawn } from 'node:child_process';
import http from 'node:http';

const PORT = Number(process.env.MOCK_PORT ?? 4010);
const PRISM_PORT = PORT + 1;
const PREFIX = '/api/v1';

const prism = spawn(
  'npx',
  ['prism', 'mock', '../backend/openapi.yaml', '--host', '127.0.0.1', '--port', String(PRISM_PORT)],
  { stdio: 'inherit', shell: process.platform === 'win32' },
);

const proxy = http.createServer((req, res) => {
  const url = req.url ?? '/';
  if (url !== PREFIX && !url.startsWith(`${PREFIX}/`) && !url.startsWith(`${PREFIX}?`)) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: `Use o prefixo ${PREFIX}` } }));
    return;
  }
  const upstream = http.request(
    {
      host: '127.0.0.1',
      port: PRISM_PORT,
      method: req.method,
      path: url.slice(PREFIX.length) || '/',
      headers: req.headers,
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );
  upstream.on('error', () => {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Prism ainda não subiu' } }),
    );
  });
  req.pipe(upstream);
});

proxy.listen(PORT, '0.0.0.0', () => {
  console.log(
    `Mock da API em http://<IP-do-computador>:${PORT}${PREFIX} (Prism na porta ${PRISM_PORT})`,
  );
});

const stop = () => {
  proxy.close();
  prism.kill();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
prism.on('exit', (code) => {
  proxy.close();
  process.exit(code ?? 1);
});
