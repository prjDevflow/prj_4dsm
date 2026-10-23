import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Resolves to backend/package.json from both src/config and dist/config.
const packageJsonPath = resolve(__dirname, '../../package.json');

export const appVersion: string = JSON.parse(readFileSync(packageJsonPath, 'utf8')).version;
