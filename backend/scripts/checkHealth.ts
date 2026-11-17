export interface HealthResponse {
  status: number;
  text(): Promise<string>;
}

export type HealthFetch = (url: string) => Promise<HealthResponse>;

export interface CheckHealthOptions {
  url: string;
  fetch: HealthFetch;
  attempts: number;
  delayMs: number;
  sleep: (ms: number) => Promise<void>;
  log: (text: string) => void;
}

export interface CheckHealthResult {
  ok: boolean;
  tentativas: number;
  /** Reason of the last failed attempt; absent when ok. */
  motivo?: string;
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** One attempt: null when healthy, otherwise the reason. */
async function probe(url: string, fetch: HealthFetch): Promise<string | null> {
  let response: HealthResponse;
  try {
    response = await fetch(url);
  } catch (error) {
    return `falha de rede: ${message(error)}`;
  }
  if (response.status !== 200) return `HTTP ${response.status}`;

  let body: unknown;
  try {
    body = JSON.parse(await response.text());
  } catch {
    return 'o corpo não é JSON';
  }
  const { status, db } = (body ?? {}) as { status?: unknown; db?: unknown };
  if (status !== 'ok') return `status ${String(status)}`;
  if (db !== 'up') return `db ${String(db)}`;
  return null;
}

/**
 * Post-deploy smoke test (B10): the new revision is accepted only when GET /health answers 200 with
 * `status: ok` and `db: up` over HTTPS. Retries while the revision starts.
 */
export async function checkHealth(options: CheckHealthOptions): Promise<CheckHealthResult> {
  const { url, fetch, attempts, delayMs, sleep, log } = options;
  if (!url.startsWith('https://')) {
    throw new Error(`A URL do /health precisa ser HTTPS: ${url}`);
  }
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new Error(`O número de tentativas precisa ser um inteiro maior que zero: ${attempts}`);
  }

  let motivo = '';
  for (let tentativa = 1; tentativa <= attempts; tentativa += 1) {
    const failure = await probe(url, fetch);
    if (failure === null) {
      log(`Tentativa ${tentativa}/${attempts}: /health ok e db up.`);
      return { ok: true, tentativas: tentativa };
    }
    motivo = failure;
    log(`Tentativa ${tentativa}/${attempts}: ${failure}.`);
    if (tentativa < attempts) await sleep(delayMs);
  }
  return { ok: false, tentativas: attempts, motivo };
}
