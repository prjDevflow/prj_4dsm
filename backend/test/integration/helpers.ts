import { randomUUID } from 'node:crypto';
import { expect } from 'vitest';
import { container } from '../../src/main/container';
import type { Prisma } from '../../src/generated/prisma/client';

export const prisma = container.prisma;

/**
 * Asserts that the database rejected the operation because of `constraint` (a unique index, a CHECK
 * or a foreign key name). Matching the name keeps an unrelated failure, such as a typo in the test,
 * from passing as "rejected".
 */
export async function expectViolation(operation: Promise<unknown>, constraint: string) {
  const error = await operation.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error, `esperava a violação de "${constraint}", mas a operação foi aceita`).toBeDefined();
  const meta = (error as { meta?: unknown }).meta;
  expect(JSON.stringify(meta ?? String(error))).toContain(constraint);
}

/** Empties every table except Prisma's own migration history, resetting sequences. */
export async function resetDatabase() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

/** Valid-looking hashes, so rows satisfy the CHECK constraints without hashing anything. */
export const BCRYPT_HASH = `$2b$04$${'a'.repeat(53)}`;
export const sha256Hex = (seed: string) => seed.repeat(64).slice(0, 64);

let counter = 0;
const next = () => ++counter;

export function insertUser(overrides: Partial<Prisma.UserUncheckedCreateInput> = {}) {
  return prisma.user.create({
    data: {
      nome: 'Pessoa de Teste',
      email: `pessoa${next()}@teste.local`,
      senhaHash: BCRYPT_HASH,
      perfil: 'VISITANTE',
      ...overrides,
    },
  });
}

export function insertBuilding(overrides: Partial<Prisma.BuildingUncheckedCreateInput> = {}) {
  return prisma.building.create({
    data: {
      nome: 'Edifício de Teste',
      endereco: 'Rua Teste, 1',
      latitude: -23.30512,
      longitude: -45.96551,
      ...overrides,
    },
  });
}

export async function insertAccessPoint(
  overrides: Partial<Prisma.AccessPointUncheckedCreateInput> = {},
) {
  const buildingId = overrides.buildingId ?? (await insertBuilding()).id;
  return prisma.accessPoint.create({
    data: {
      buildingId,
      tipo: 'CATRACA',
      nome: 'Catraca de Teste',
      identificacao: `CAT-${next()}`,
      latitude: -23.30512,
      longitude: -45.96551,
      ...overrides,
    },
  });
}

export async function insertTerminal(overrides: Partial<Prisma.TerminalUncheckedCreateInput> = {}) {
  const accessPointId = overrides.accessPointId ?? (await insertAccessPoint()).id;
  return prisma.terminal.create({
    data: { accessPointId, nome: 'Terminal de Teste', apiKeyHash: sha256Hex('a'), ...overrides },
  });
}

export async function insertAuthorization(
  overrides: Partial<Prisma.AuthorizationUncheckedCreateInput> = {},
) {
  const usuarioId = overrides.usuarioId ?? (await insertUser()).id;
  const criadoPorId = overrides.criadoPorId ?? (await insertUser({ perfil: 'ADMIN' })).id;
  const accessPointId = overrides.accessPointId ?? (await insertAccessPoint()).id;
  return prisma.authorization.create({
    data: {
      usuarioId,
      criadoPorId,
      accessPointId,
      dataInicio: new Date('2026-10-01'),
      dataFim: new Date('2026-10-31'),
      horaInicio: '08:00',
      horaFim: '18:00',
      usosPermitidos: 3,
      ...overrides,
    },
  });
}

export async function insertNfcTag(overrides: Partial<Prisma.NfcTagUncheckedCreateInput> = {}) {
  const usuarioId = overrides.usuarioId ?? (await insertUser()).id;
  return prisma.nfcTag.create({ data: { usuarioId, uid: '04A1B2C3D4', ...overrides } });
}

export async function insertQrCredential(
  overrides: Partial<Prisma.QrCredentialUncheckedCreateInput> = {},
) {
  const terminalId = overrides.terminalId ?? (await insertTerminal()).id;
  const emitidoEm = new Date('2026-10-20T14:00:00Z');
  return prisma.qrCredential.create({
    data: {
      terminalId,
      tokenHash: sha256Hex('b'),
      emitidoEm,
      expiraEm: new Date(emitidoEm.getTime() + 15_000),
      ...overrides,
    },
  });
}

export const newId = () => randomUUID();
