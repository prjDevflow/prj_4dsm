// Post-deploy smoke test (B10, used by cd.yml): npx tsx scripts/smoke-health.ts https://<host>/api/v1/health
// Exits with 1 when the /health does not answer `status: ok` and `db: up` over HTTPS.
import { checkHealth } from './checkHealth';

const ATTEMPTS = Number(process.env.SMOKE_ATTEMPTS ?? 12);
const DELAY_MS = Number(process.env.SMOKE_DELAY_MS ?? 10_000);

async function main() {
  const url = process.argv[2];
  if (!url) throw new Error('Uso: tsx scripts/smoke-health.ts https://<host>/api/v1/health');

  const result = await checkHealth({
    url,
    fetch: (target) => fetch(target, { signal: AbortSignal.timeout(10_000) }),
    attempts: ATTEMPTS,
    delayMs: DELAY_MS,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    log: (text) => process.stdout.write(`${text}\n`),
  });
  if (!result.ok) {
    throw new Error(`O /health não ficou saudável em ${result.tentativas} tentativas: ${result.motivo}.`);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
