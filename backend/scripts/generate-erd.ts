// npm run db:erd: regenerates docs/modelo-de-dados.md from prisma/schema.prisma.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderModelDoc } from './renderModelDoc';

const root = resolve(__dirname, '..');
const schema = readFileSync(resolve(root, 'prisma/schema.prisma'), 'utf8');

writeFileSync(resolve(root, 'docs/modelo-de-dados.md'), renderModelDoc(schema));
process.stdout.write('docs/modelo-de-dados.md atualizado.\n');
