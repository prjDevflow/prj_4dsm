import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { schemaToMermaid } from './schemaToMermaid';

const fixture = `
// A comment that must be ignored.
generator client {
  provider = "prisma-client"
}

enum Perfil {
  ADMIN
  VISITANTE

  @@map("perfil")
}

/// A documented model.
model User {
  id       String   @id @default(uuid()) @db.Uuid
  email    String   @unique @db.VarChar(254)
  perfil   Perfil
  ativo    Boolean  @default(true)
  criadoEm DateTime @default(now()) @db.Timestamptz(3)
  posts    Post[]
  revisoes Post[]   @relation("Revisor")

  @@map("users")
}

model Post {
  id        Int     @id @default(autoincrement())
  autorId   String  @db.Uuid
  revisorId String? @db.Uuid
  nota      Float?
  detalhes  Json?
  autor     User    @relation(fields: [autorId], references: [id], onDelete: Restrict)
  revisor   User?   @relation("Revisor", fields: [revisorId], references: [id])

  @@index([autorId])
  @@map("posts")
}

model Perfil2 {
  id   String @id @db.Uuid
  slug String @unique
}
`;

describe('schemaToMermaid', () => {
  const diagram = schemaToMermaid(fixture);

  it('deve começar com erDiagram', () => {
    expect(diagram.startsWith('erDiagram')).toBe(true);
  });

  it('deve nomear a entidade pela tabela do @@map e pelo nome do model quando não há @@map', () => {
    expect(diagram).toContain('users {');
    expect(diagram).toContain('posts {');
    expect(diagram).toContain('Perfil2 {');
  });

  it('deve marcar chave primária e coluna única', () => {
    expect(diagram).toContain('uuid id PK');
    expect(diagram).toContain('varchar(254) email UK');
    expect(diagram).toContain('text slug UK');
  });

  it('deve usar o tipo do @db em minúsculas e o tipo padrão do Prisma quando não há @db', () => {
    expect(diagram).toContain('timestamptz(3) criadoEm');
    expect(diagram).toContain('boolean ativo');
    expect(diagram).toContain('int id PK');
    expect(diagram).toContain('float nota');
    expect(diagram).toContain('jsonb detalhes');
  });

  it('deve mostrar o enum pelo nome da tabela do tipo', () => {
    expect(diagram).toContain('perfil perfil');
  });

  it('deve marcar a chave estrangeira e indicar colunas opcionais', () => {
    expect(diagram).toContain('uuid autorId FK');
    expect(diagram).toContain('uuid revisorId FK "opcional"');
    expect(diagram).toContain('float nota "opcional"');
  });

  it('deve ligar as entidades: obrigatória como um para muitos e opcional como zero ou um', () => {
    expect(diagram).toContain('users ||--o{ posts : "autorId"');
    expect(diagram).toContain('users |o--o{ posts : "revisorId"');
  });

  it('não deve listar campos de relação como colunas', () => {
    expect(diagram).not.toContain('Post[]');
    // Column lines look like "    <type> <name>"; relation fields would show up as "User autor".
    expect(diagram).not.toMatch(/^\s+\S+ (autor|revisor|posts|revisoes)\b/m);
  });

  it('deve gerar uma relação um-para-um quando a chave estrangeira é única', () => {
    const oneToOne = schemaToMermaid(`
model A {
  id String @id @db.Uuid
  b  B?
}

model B {
  id  String @id @db.Uuid
  aId String @unique @db.Uuid
  a   A      @relation(fields: [aId], references: [id])
}`);

    expect(oneToOne).toContain('A ||--o| B : "aId"');
  });

  it('deve gerar o diagrama do schema real com as nove tabelas e as relações de autorização', () => {
    const real = schemaToMermaid(
      readFileSync(resolve(__dirname, '../prisma/schema.prisma'), 'utf8'),
    );

    for (const table of [
      'users',
      'buildings',
      'access_points',
      'terminals',
      'authorizations',
      'nfc_tags',
      'qr_credentials',
      'terminal_commands',
      'access_events',
    ]) {
      expect(real).toContain(`${table} {`);
    }
    expect(real).toContain('users ||--o{ authorizations : "usuarioId"');
    expect(real).toContain('access_points ||--o| terminals : "accessPointId"');
  });
});
