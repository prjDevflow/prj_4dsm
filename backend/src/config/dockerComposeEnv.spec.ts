import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { parse } from 'yaml';
import { ENV_KEYS } from './parseEnv';

// The API container only sees the variables listed in its `environment` block, so a key the
// code reads but the compose file does not forward silently falls back to its default.
const compose = parse(readFileSync(join(__dirname, '../../docker-compose.yml'), 'utf8')) as {
  services: { api: { environment: Record<string, string> } };
};
const forwarded = Object.keys(compose.services.api.environment);

describe('docker-compose (serviço api)', () => {
  it.each(ENV_KEYS)('deve repassar %s para o contêiner da API', (key) => {
    expect(forwarded).toContain(key);
  });
});
