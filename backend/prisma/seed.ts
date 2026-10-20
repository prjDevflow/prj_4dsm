// Development seed (B04). Idempotent: every row has a fixed id and is written with upsert, so running
// it twice changes nothing. The credentials come from the environment (see .env.example); they are
// public development values, which is why parseSeedEnv refuses NODE_ENV=production by default.
import { createHash } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { config as loadDotenv } from 'dotenv';
import { InvalidEnvError } from '../src/config/parseEnv';
import { parseSeedEnv } from '../src/config/parseSeedEnv';
import { todayInSaoPaulo } from '../src/entities/rules/todayInSaoPaulo';
import { PrismaClient } from '../src/generated/prisma/client';
import { SystemClock } from '../src/infra/providers/SystemClock';
import type { IClock } from '../src/providers/IClock';

/** Fixed ids: the terminal simulator and the tests always point at the same rows. */
export const SEED_IDS = {
  admin: '5eed0000-0000-4000-8000-000000000001',
  condomino: '5eed0000-0000-4000-8000-000000000002',
  visitor: '5eed0000-0000-4000-8000-000000000003',
  building: '5eed0000-0000-4000-8000-000000000004',
  accessPoint: '5eed0000-0000-4000-8000-000000000005',
  terminal: '5eed0000-0000-4000-8000-000000000006',
  authorization: '5eed0000-0000-4000-8000-000000000007',
} as const;

/** How long the visitor's authorization stays valid, counted from the day the seed runs. */
const AUTHORIZATION_DAYS = 365;

export interface SeedHasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}

export interface SeedOptions {
  admin: { email: string; password: string };
  /** Shared by the test condômino and the test visitor. */
  userPassword: string;
  terminalKey: string;
  location: { latitude: number; longitude: number };
  clock: IClock;
  hasher: SeedHasher;
}

export interface SeedResult {
  adminId: string;
  condominoId: string;
  visitorId: string;
  buildingId: string;
  accessPointId: string;
  terminalId: string;
  authorizationId: string;
}

const sha256Hex = (text: string) => createHash('sha256').update(text).digest('hex');

function addDays(isoDate: string, days: number): Date {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

interface UserSeed {
  id: string;
  nome: string;
  email: string;
  perfil: 'ADMIN' | 'CONDOMINO' | 'VISITANTE';
  password: string;
}

async function seedUser(prisma: PrismaClient, hasher: SeedHasher, seed: UserSeed) {
  const { id, nome, email, perfil, password } = seed;
  const existing = await prisma.user.findUnique({ where: { id } });

  if (!existing) {
    await prisma.user.create({
      data: { id, nome, email, perfil, senhaHash: await hasher.hash(password) },
    });
    return;
  }

  // A bcrypt hash is salted, so rewriting it on every run would change the row for nothing.
  // `ativo` is left alone as well: a user deactivated on purpose stays deactivated.
  const samePassword = await hasher.compare(password, existing.senhaHash);
  await prisma.user.update({
    where: { id },
    data: { nome, email, perfil, ...(!samePassword && { senhaHash: await hasher.hash(password) }) },
  });
}

export async function runSeed(prisma: PrismaClient, options: SeedOptions): Promise<SeedResult> {
  const { admin, userPassword, terminalKey, location, clock, hasher } = options;

  await seedUser(prisma, hasher, {
    id: SEED_IDS.admin,
    nome: 'Administrador (dev)',
    email: admin.email.trim().toLowerCase(),
    perfil: 'ADMIN',
    password: admin.password,
  });
  await seedUser(prisma, hasher, {
    id: SEED_IDS.condomino,
    nome: 'Condômino de Teste',
    email: 'condomino@dev.local',
    perfil: 'CONDOMINO',
    password: userPassword,
  });
  await seedUser(prisma, hasher, {
    id: SEED_IDS.visitor,
    nome: 'Visitante de Teste',
    email: 'visitante@dev.local',
    perfil: 'VISITANTE',
    password: userPassword,
  });

  const place = { latitude: location.latitude, longitude: location.longitude };

  await prisma.building.upsert({
    where: { id: SEED_IDS.building },
    create: {
      id: SEED_IDS.building,
      nome: 'Edifício de Testes',
      endereco: 'Local de testes (dev)',
      ...place,
    },
    update: { nome: 'Edifício de Testes', endereco: 'Local de testes (dev)', ...place },
  });

  await prisma.accessPoint.upsert({
    where: { id: SEED_IDS.accessPoint },
    create: {
      id: SEED_IDS.accessPoint,
      buildingId: SEED_IDS.building,
      tipo: 'CATRACA',
      nome: 'Catraca de Testes',
      identificacao: 'CAT-01',
      ...place,
    },
    update: { nome: 'Catraca de Testes', identificacao: 'CAT-01', ...place },
  });

  // Only the SHA-256 of the key is stored; the key itself lives in the environment.
  const apiKeyHash = sha256Hex(terminalKey);
  await prisma.terminal.upsert({
    where: { id: SEED_IDS.terminal },
    create: {
      id: SEED_IDS.terminal,
      accessPointId: SEED_IDS.accessPoint,
      nome: 'Terminal de Desenvolvimento',
      apiKeyHash,
    },
    update: { nome: 'Terminal de Desenvolvimento', apiKeyHash },
  });

  // 00:00 to 23:59, 100 uses, valid from today. On a rerun only the end date moves, so the
  // authorization stays valid without resetting the uses already spent or reviving a cancelled one.
  const today = todayInSaoPaulo(clock.now());
  const dataFim = addDays(today, AUTHORIZATION_DAYS);
  await prisma.authorization.upsert({
    where: { id: SEED_IDS.authorization },
    create: {
      id: SEED_IDS.authorization,
      usuarioId: SEED_IDS.visitor,
      accessPointId: SEED_IDS.accessPoint,
      dataInicio: addDays(today, 0),
      dataFim,
      horaInicio: '00:00',
      horaFim: '23:59',
      usosPermitidos: 100,
      criadoPorId: SEED_IDS.admin,
    },
    update: { dataFim },
  });

  return {
    adminId: SEED_IDS.admin,
    condominoId: SEED_IDS.condomino,
    visitorId: SEED_IDS.visitor,
    buildingId: SEED_IDS.building,
    accessPointId: SEED_IDS.accessPoint,
    terminalId: SEED_IDS.terminal,
    authorizationId: SEED_IDS.authorization,
  };
}

async function main() {
  loadDotenv();

  let env;
  try {
    env = parseSeedEnv(process.env);
  } catch (error) {
    if (error instanceof InvalidEnvError) {
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }
  if (!process.env.DATABASE_URL) {
    process.stderr.write('DATABASE_URL é obrigatória para rodar o seed.\n');
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const result = await runSeed(prisma, {
      admin: { email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
      userPassword: env.SEED_USER_PASSWORD,
      terminalKey: env.SEED_TERMINAL_KEY,
      location: { latitude: env.SEED_LATITUDE, longitude: env.SEED_LONGITUDE },
      clock: new SystemClock(),
      hasher: {
        hash: (plain) => bcrypt.hash(plain, env.BCRYPT_COST),
        compare: (plain, hash) => bcrypt.compare(plain, hash),
      },
    });
    // Ids and e-mails only: never print passwords or the terminal key.
    process.stdout.write(
      [
        'Seed aplicado.',
        `  administrador: ${env.SEED_ADMIN_EMAIL} (${result.adminId})`,
        '  condômino:     condomino@dev.local',
        '  visitante:     visitante@dev.local',
        `  terminal:      ${result.terminalId}`,
        '',
      ].join('\n'),
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `Falha no seed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  });
}
