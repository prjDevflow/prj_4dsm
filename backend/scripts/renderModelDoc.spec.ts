import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { renderModelDoc } from './renderModelDoc';

const schema = `
enum Perfil {
  ADMIN
  VISITANTE

  @@map("perfil")
}

enum Tipo {
  A
  B
}

model User {
  id     String @id @db.Uuid
  perfil Perfil

  @@map("users")
}
`;

describe('renderModelDoc', () => {
  const doc = renderModelDoc(schema);

  it('deve avisar que o arquivo é gerado e como regenerá-lo', () => {
    expect(doc).toContain('npm run db:erd');
    expect(doc).toContain('prisma/schema.prisma');
  });

  it('deve embutir o diagrama Mermaid em um bloco de código', () => {
    expect(doc).toContain('```mermaid\nerDiagram');
    expect(doc).toContain('users {');
  });

  it('deve listar os enums com o nome do tipo no banco e os valores', () => {
    expect(doc).toContain('| `perfil` | ADMIN, VISITANTE |');
    expect(doc).toContain('| `Tipo` | A, B |');
  });

  it('deve explicar que os CHECK ficam na migração e não aparecem no diagrama', () => {
    expect(doc).toContain('CHECK');
    expect(doc).toContain('migration.sql');
  });

  it('deve terminar com uma quebra de linha', () => {
    expect(doc.endsWith('\n')).toBe(true);
  });

  it('deve ser igual ao docs/modelo-de-dados.md versionado (rode npm run db:erd se falhar)', () => {
    const real = readFileSync(resolve(__dirname, '../prisma/schema.prisma'), 'utf8');
    const committed = readFileSync(resolve(__dirname, '../docs/modelo-de-dados.md'), 'utf8');

    expect(committed).toBe(renderModelDoc(real));
  });
});
