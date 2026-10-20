import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { describe, it, expect, beforeEach } from 'vitest';
import { runSeed, SEED_IDS, type SeedOptions } from '../../prisma/seed';
import { computeEffectiveStatus } from '../../src/entities/rules/computeEffectiveStatus';
import { FakeClock } from '../doubles/FakeClock';
import { prisma, resetDatabase } from './helpers';

// 12:00 in São Paulo on 2026-10-20.
const noon = new Date('2026-10-20T15:00:00Z');

const makeOptions = (overrides: Partial<SeedOptions> = {}): SeedOptions => ({
  admin: { email: 'Admin@Dev.Local', password: 'senha-do-admin-1' },
  userPassword: 'senha-dos-usuarios-1',
  terminalKey: 'chave-de-desenvolvimento-do-terminal-0001',
  location: { latitude: -23.30512, longitude: -45.96551 },
  clock: new FakeClock(noon),
  // Cost 4 is the bcrypt minimum: fast enough for tests.
  hasher: {
    hash: (plain) => bcrypt.hash(plain, 4),
    compare: (plain, hash) => bcrypt.compare(plain, hash),
  },
  ...overrides,
});

const counts = async () => ({
  users: await prisma.user.count(),
  buildings: await prisma.building.count(),
  accessPoints: await prisma.accessPoint.count(),
  terminals: await prisma.terminal.count(),
  authorizations: await prisma.authorization.count(),
});

describe('runSeed', () => {
  beforeEach(resetDatabase);

  it('cria um administrador, um condômino, um visitante, um edifício, uma catraca, um terminal e uma autorização', async () => {
    await runSeed(prisma, makeOptions());

    expect(await counts()).toEqual({
      users: 3,
      buildings: 1,
      accessPoints: 1,
      terminals: 1,
      authorizations: 1,
    });
    const perfis = (await prisma.user.findMany({ orderBy: { perfil: 'asc' } })).map(
      (u) => u.perfil,
    );
    expect(perfis).toEqual(['ADMIN', 'CONDOMINO', 'VISITANTE']);
    expect(await prisma.accessPoint.findFirstOrThrow()).toMatchObject({ tipo: 'CATRACA' });
  });

  it('pode ser executado duas vezes sem duplicar registros nem falhar', async () => {
    await runSeed(prisma, makeOptions());
    const first = await counts();

    await expect(runSeed(prisma, makeOptions())).resolves.toBeDefined();

    expect(await counts()).toEqual(first);
  });

  it('usa ids fixos, para o simulador do terminal e os testes apontarem sempre para o mesmo registro', async () => {
    const result = await runSeed(prisma, makeOptions());

    expect(result).toMatchObject({
      adminId: SEED_IDS.admin,
      visitorId: SEED_IDS.visitor,
      terminalId: SEED_IDS.terminal,
    });
    expect(await prisma.terminal.findUnique({ where: { id: SEED_IDS.terminal } })).not.toBeNull();
  });

  it('normaliza o e-mail do administrador para minúsculas', async () => {
    await runSeed(prisma, makeOptions());

    const admin = await prisma.user.findUniqueOrThrow({ where: { id: SEED_IDS.admin } });
    expect(admin.email).toBe('admin@dev.local');
  });

  it('guarda as senhas só como hash bcrypt que confere com a senha informada', async () => {
    await runSeed(prisma, makeOptions());

    const admin = await prisma.user.findUniqueOrThrow({ where: { id: SEED_IDS.admin } });
    const visitor = await prisma.user.findUniqueOrThrow({ where: { id: SEED_IDS.visitor } });
    expect(admin.senhaHash).not.toContain('senha-do-admin-1');
    expect(await bcrypt.compare('senha-do-admin-1', admin.senhaHash)).toBe(true);
    expect(await bcrypt.compare('senha-dos-usuarios-1', visitor.senhaHash)).toBe(true);
  });

  it('guarda a chave do terminal só como SHA-256', async () => {
    const options = makeOptions();
    await runSeed(prisma, options);

    const terminal = await prisma.terminal.findUniqueOrThrow({ where: { id: SEED_IDS.terminal } });
    expect(terminal.apiKeyHash).toBe(
      createHash('sha256').update(options.terminalKey).digest('hex'),
    );
    expect(terminal.apiKeyHash).not.toContain(options.terminalKey);
  });

  it('cria para o visitante uma autorização vigente de 00:00 a 23:59 com 100 usos', async () => {
    await runSeed(prisma, makeOptions());

    const authorization = await prisma.authorization.findUniqueOrThrow({
      where: { id: SEED_IDS.authorization },
    });
    expect(authorization).toMatchObject({
      usuarioId: SEED_IDS.visitor,
      accessPointId: SEED_IDS.accessPoint,
      criadoPorId: SEED_IDS.admin,
      horaInicio: '00:00',
      horaFim: '23:59',
      usosPermitidos: 100,
      usosRealizados: 0,
      situacao: 'ATIVA',
    });
    expect(authorization.dataInicio.toISOString().slice(0, 10)).toBe('2026-10-20');
    expect(authorization.dataFim.toISOString().slice(0, 10)).toBe('2027-10-20');
    expect(
      computeEffectiveStatus(
        {
          ...authorization,
          dataFim: authorization.dataFim.toISOString().slice(0, 10),
        },
        noon,
      ),
    ).toBe('ATIVA');
  });

  it('usa o dia de São Paulo, e não o de UTC, para abrir a janela da autorização', async () => {
    const clock = new FakeClock(new Date('2026-10-21T02:30:00Z'));

    await runSeed(prisma, makeOptions({ clock }));

    const authorization = await prisma.authorization.findUniqueOrThrow({
      where: { id: SEED_IDS.authorization },
    });
    expect(authorization.dataInicio.toISOString().slice(0, 10)).toBe('2026-10-20');
  });

  it('usa as coordenadas informadas no edifício e na catraca', async () => {
    await runSeed(prisma, makeOptions({ location: { latitude: -1.5, longitude: 2.5 } }));

    expect(await prisma.building.findFirstOrThrow()).toMatchObject({
      latitude: -1.5,
      longitude: 2.5,
    });
    expect(await prisma.accessPoint.findFirstOrThrow()).toMatchObject({
      latitude: -1.5,
      longitude: 2.5,
    });
  });

  describe('ao reexecutar', () => {
    it('renova a janela de datas da autorização quando o relógio avança', async () => {
      const clock = new FakeClock(noon);
      await runSeed(prisma, makeOptions({ clock }));

      clock.set(new Date('2027-03-01T15:00:00Z'));
      await runSeed(prisma, makeOptions({ clock }));

      const authorization = await prisma.authorization.findUniqueOrThrow({
        where: { id: SEED_IDS.authorization },
      });
      // 365 days after 2027-03-01 lands on a leap day.
      expect(authorization.dataFim.toISOString().slice(0, 10)).toBe('2028-02-29');
    });

    it('não zera os usos já realizados', async () => {
      await runSeed(prisma, makeOptions());
      await prisma.authorization.update({
        where: { id: SEED_IDS.authorization },
        data: { usosRealizados: 7 },
      });

      await runSeed(prisma, makeOptions());

      const authorization = await prisma.authorization.findUniqueOrThrow({
        where: { id: SEED_IDS.authorization },
      });
      expect(authorization.usosRealizados).toBe(7);
    });

    it('não reativa uma autorização cancelada', async () => {
      await runSeed(prisma, makeOptions());
      await prisma.authorization.update({
        where: { id: SEED_IDS.authorization },
        data: { situacao: 'CANCELADA', canceladoEm: noon, canceladoPorId: SEED_IDS.admin },
      });

      await runSeed(prisma, makeOptions());

      const authorization = await prisma.authorization.findUniqueOrThrow({
        where: { id: SEED_IDS.authorization },
      });
      expect(authorization.situacao).toBe('CANCELADA');
    });

    it('mantém o hash da senha quando a senha não mudou', async () => {
      await runSeed(prisma, makeOptions());
      const before = await prisma.user.findUniqueOrThrow({ where: { id: SEED_IDS.admin } });

      await runSeed(prisma, makeOptions());

      const after = await prisma.user.findUniqueOrThrow({ where: { id: SEED_IDS.admin } });
      expect(after.senhaHash).toBe(before.senhaHash);
    });

    it('troca o hash quando a senha do ambiente mudou', async () => {
      await runSeed(prisma, makeOptions());

      await runSeed(
        prisma,
        makeOptions({ admin: { email: 'admin@dev.local', password: 'outra-senha-9' } }),
      );

      const admin = await prisma.user.findUniqueOrThrow({ where: { id: SEED_IDS.admin } });
      expect(await bcrypt.compare('outra-senha-9', admin.senhaHash)).toBe(true);
    });

    it('atualiza o hash da chave do terminal quando a chave mudou', async () => {
      await runSeed(prisma, makeOptions());

      await runSeed(prisma, makeOptions({ terminalKey: 'nova-chave-de-desenvolvimento-0002-xx' }));

      const terminal = await prisma.terminal.findUniqueOrThrow({
        where: { id: SEED_IDS.terminal },
      });
      expect(terminal.apiKeyHash).toBe(
        createHash('sha256').update('nova-chave-de-desenvolvimento-0002-xx').digest('hex'),
      );
    });
  });
});
