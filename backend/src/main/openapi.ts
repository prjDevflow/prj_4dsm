import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

// Same relative path from src/main (tsx) and dist/main (compiled): openapi.yaml sits next to package.json.
const SPEC_PATH = path.resolve(__dirname, '../../openapi.yaml');

export function loadOpenApiSpec(): Record<string, unknown> {
  return parse(readFileSync(SPEC_PATH, 'utf8'));
}
