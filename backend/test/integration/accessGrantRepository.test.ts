import { beforeEach, describe, expect, it } from 'vitest';
import { AccessEvent } from '../../src/entities/AccessEvent';
import { TerminalCommand } from '../../src/entities/TerminalCommand';
import { PrismaAccessGrantRepository } from '../../src/infra/repositories/PrismaAccessGrantRepository';
import type {
  CommitApprovalInput,
  CommitNfcApprovalInput,
} from '../../src/repositories/IAccessGrantRepository';
import {
  expectViolation,
  insertAccessPoint,
  insertAuthorization,
  insertQrCredential,
  insertTerminal,
  insertUser,
  newId,
  prisma,
  resetDatabase,
  sha256Hex,
} from './helpers';

const grants = new PrismaAccessGrantRepository(prisma);

const NOW = new Date('2026-10-20T14:00:05.000Z');

/** A user with one authorization for a point that has a terminal, plus a fresh credential of that terminal. */
async function seedScene(authorizationOverrides: Parameters<typeof insertAuthorization>[0] = {}) {
  const user = await insertUser();
  const accessPoint = await insertAccessPoint();
  const terminal = await insertTerminal({ accessPointId: accessPoint.id });
  const authorization = await insertAuthorization({
    usuarioId: user.id,
    accessPointId: accessPoint.id,
    ...authorizationOverrides,
  });
  const credential = await insertQrCredential({ terminalId: terminal.id });
  return { user, accessPoint, terminal, authorization, credential };
}

type Scene = Awaited<ReturnType<typeof seedScene>>;

/** The input of an approval for `scene`, with ids that exist in the database. */
function inputFor(scene: Scene, overrides: Partial<CommitApprovalInput> = {}): CommitApprovalInput {
  return {
    credentialId: scene.credential.id,
    userId: scene.user.id,
    authorizationId: scene.authorization.id,
    now: NOW,
    event: AccessEvent.approved({
      id: newId(),
      ocorridoEm: NOW,
      metodo: 'QR',
      terminalId: scene.terminal.id,
      accessPointId: scene.accessPoint.id,
      usuarioId: scene.user.id,
      authorizationId: scene.authorization.id,
      distanciaM: 14.5,
    }),
    command: TerminalCommand.open({
      terminalId: scene.terminal.id,
      now: NOW,
      ttlSeconds: 10,
      aberturaMs: 5000,
    }),
    ...overrides,
  };
}

const credentialRow = (id: string) => prisma.qrCredential.findUniqueOrThrow({ where: { id } });
const authorizationRow = (id: string) => prisma.authorization.findUniqueOrThrow({ where: { id } });
const counts = async () => ({
  events: await prisma.accessEvent.count(),
  commands: await prisma.terminalCommand.count(),
});

describe('PrismaAccessGrantRepository.commitApproval', () => {
  beforeEach(resetDatabase);

  it('consome a credencial e um uso, grava o evento e o comando e devolve os usos restantes', async () => {
    const scene = await seedScene({ usosPermitidos: 3 });

    const result = await grants.commitApproval(inputFor(scene));

    expect(result).toEqual({ ok: true, usosRestantes: 2 });
    expect(await credentialRow(scene.credential.id)).toMatchObject({
      consumidoEm: NOW,
      consumidoPorId: scene.user.id,
    });
    expect((await authorizationRow(scene.authorization.id)).usosRealizados).toBe(1);
    expect(await counts()).toEqual({ events: 1, commands: 1 });
    expect(await prisma.accessEvent.findFirstOrThrow()).toMatchObject({
      resultado: 'AUTORIZADO',
      motivo: null,
      authorizationId: scene.authorization.id,
      distanciaM: 14.5,
    });
    expect(await prisma.terminalCommand.findFirstOrThrow()).toMatchObject({
      terminalId: scene.terminal.id,
      tipo: 'ABRIR',
      aberturaMs: 5000,
      motivo: null,
      entregueEm: null,
      executadoEm: null,
    });
  });

  it('devolve zero usos restantes ao consumir o último', async () => {
    const scene = await seedScene({ usosPermitidos: 1 });

    expect(await grants.commitApproval(inputFor(scene))).toEqual({ ok: true, usosRestantes: 0 });
  });

  it('nega com CREDENCIAL_REUTILIZADA e não toca em nada quando a credencial já foi consumida', async () => {
    const scene = await seedScene();
    const other = await insertUser();
    await prisma.qrCredential.update({
      where: { id: scene.credential.id },
      data: { consumidoEm: new Date('2026-10-20T14:00:02.000Z'), consumidoPorId: other.id },
    });

    const result = await grants.commitApproval(inputFor(scene));

    expect(result).toEqual({ ok: false, reason: 'CREDENCIAL_REUTILIZADA' });
    expect((await credentialRow(scene.credential.id)).consumidoPorId).toBe(other.id);
    expect((await authorizationRow(scene.authorization.id)).usosRealizados).toBe(0);
    expect(await counts()).toEqual({ events: 0, commands: 0 });
  });

  it('nega com USOS_ESGOTADOS e desfaz a marca da credencial quando os usos acabaram', async () => {
    const scene = await seedScene({ usosPermitidos: 2, usosRealizados: 2 });

    const result = await grants.commitApproval(inputFor(scene));

    expect(result).toEqual({ ok: false, reason: 'USOS_ESGOTADOS' });
    expect(await credentialRow(scene.credential.id)).toMatchObject({
      consumidoEm: null,
      consumidoPorId: null,
    });
    expect((await authorizationRow(scene.authorization.id)).usosRealizados).toBe(2);
    expect(await counts()).toEqual({ events: 0, commands: 0 });
  });

  it('nega com USOS_ESGOTADOS e deixa a credencial livre quando a autorização foi cancelada', async () => {
    const scene = await seedScene({ situacao: 'CANCELADA' });

    const result = await grants.commitApproval(inputFor(scene));

    expect(result).toEqual({ ok: false, reason: 'USOS_ESGOTADOS' });
    expect((await credentialRow(scene.credential.id)).consumidoEm).toBeNull();
    expect((await authorizationRow(scene.authorization.id)).usosRealizados).toBe(0);
  });

  describe('falha no meio da aprovação (tudo ou nada)', () => {
    it('desfaz o uso e a credencial quando o evento não pode ser gravado', async () => {
      const scene = await seedScene();
      const base = inputFor(scene);
      // A user that does not exist: the foreign key of the event fails after the credential and the use were updated.
      const broken = {
        ...base,
        event: { ...base.event, usuarioId: newId() },
      };

      await expectViolation(grants.commitApproval(broken), 'access_events_usuarioId_fkey');

      expect(await credentialRow(scene.credential.id)).toMatchObject({
        consumidoEm: null,
        consumidoPorId: null,
      });
      expect((await authorizationRow(scene.authorization.id)).usosRealizados).toBe(0);
      expect(await counts()).toEqual({ events: 0, commands: 0 });
    });

    it('desfaz também o evento quando o comando não pode ser gravado', async () => {
      const scene = await seedScene();
      const base = inputFor(scene);
      const broken = { ...base, command: { ...base.command, terminalId: newId() } };

      await expectViolation(grants.commitApproval(broken), 'terminal_commands_terminalId_fkey');

      expect(await credentialRow(scene.credential.id)).toMatchObject({ consumidoEm: null });
      expect((await authorizationRow(scene.authorization.id)).usosRealizados).toBe(0);
      expect(await counts()).toEqual({ events: 0, commands: 0 });
    });
  });

  describe('concorrência', () => {
    it('aprova só uma de vinte chamadas simultâneas com a mesma credencial', async () => {
      const scene = await seedScene({ usosPermitidos: 50 });

      const results = await Promise.all(
        Array.from({ length: 20 }, () => grants.commitApproval(inputFor(scene))),
      );

      expect(results.filter((r) => r.ok)).toHaveLength(1);
      expect(results.filter((r) => !r.ok)).toEqual(
        Array.from({ length: 19 }, () => ({ ok: false, reason: 'CREDENCIAL_REUTILIZADA' })),
      );
      expect((await authorizationRow(scene.authorization.id)).usosRealizados).toBe(1);
      expect(await counts()).toEqual({ events: 1, commands: 1 });
    });

    it('aprova só uma de oito credenciais diferentes quando resta um uso, e as outras ficam livres', async () => {
      const scene = await seedScene({ usosPermitidos: 3, usosRealizados: 2 });
      const credentials = [scene.credential];
      for (let i = 1; i < 8; i += 1) {
        credentials.push(
          await insertQrCredential({
            terminalId: scene.terminal.id,
            tokenHash: sha256Hex(`c${i}`),
          }),
        );
      }

      const results = await Promise.all(
        credentials.map((credential) =>
          grants.commitApproval(inputFor(scene, { credentialId: credential.id })),
        ),
      );

      expect(results.filter((r) => r.ok)).toHaveLength(1);
      expect(results.filter((r) => !r.ok)).toEqual(
        Array.from({ length: 7 }, () => ({ ok: false, reason: 'USOS_ESGOTADOS' })),
      );
      expect((await authorizationRow(scene.authorization.id)).usosRealizados).toBe(3);
      const used = await prisma.qrCredential.count({ where: { consumidoEm: { not: null } } });
      expect(used).toBe(1);
      expect(await counts()).toEqual({ events: 1, commands: 1 });
    });

    it('aprova exatamente os usos que restam entre oito credenciais diferentes', async () => {
      const scene = await seedScene({ usosPermitidos: 3 });
      const credentials = [scene.credential];
      for (let i = 1; i < 8; i += 1) {
        credentials.push(
          await insertQrCredential({
            terminalId: scene.terminal.id,
            tokenHash: sha256Hex(`d${i}`),
          }),
        );
      }

      const results = await Promise.all(
        credentials.map((credential) =>
          grants.commitApproval(inputFor(scene, { credentialId: credential.id })),
        ),
      );

      expect(results.filter((r) => r.ok)).toHaveLength(3);
      expect((await authorizationRow(scene.authorization.id)).usosRealizados).toBe(3);
      expect(await counts()).toEqual({ events: 3, commands: 3 });
    });
  });
});

describe('PrismaAccessGrantRepository.commitNfcApproval', () => {
  beforeEach(resetDatabase);

  const UID = '04A1B2C3D4';

  /** The input of an NFC approval for `scene`; every call gets its own event id and, by default, its own key. */
  function nfcInputFor(
    scene: Scene,
    { clientEventId = newId() }: { clientEventId?: string } = {},
  ): CommitNfcApprovalInput {
    return {
      authorizationId: scene.authorization.id,
      event: AccessEvent.approved({
        id: newId(),
        ocorridoEm: NOW,
        metodo: 'NFC',
        terminalId: scene.terminal.id,
        accessPointId: scene.accessPoint.id,
        usuarioId: scene.user.id,
        authorizationId: scene.authorization.id,
        clientEventId,
        uid: UID,
      }),
    };
  }

  const usesOf = async (scene: Scene) =>
    (await prisma.authorization.findUniqueOrThrow({ where: { id: scene.authorization.id } }))
      .usosRealizados;

  it('deve gravar o evento e consumir um uso, devolvendo os usos restantes, sem credencial nem comando', async () => {
    const scene = await seedScene({ usosPermitidos: 3 });
    const input = nfcInputFor(scene);

    const result = await grants.commitNfcApproval(input);

    expect(result).toEqual({ ok: true, usosRestantes: 2 });
    expect(await usesOf(scene)).toBe(1);
    expect(await prisma.accessEvent.findUniqueOrThrow({ where: { id: input.event.id } })).toEqual(
      input.event,
    );
    expect(
      (await prisma.qrCredential.findUniqueOrThrow({ where: { id: scene.credential.id } }))
        .consumidoEm,
    ).toBeNull();
    expect(await prisma.terminalCommand.count()).toBe(0);
  });

  it('deve devolver USOS_ESGOTADOS sem deixar o evento quando os usos acabaram', async () => {
    const scene = await seedScene({ usosPermitidos: 2, usosRealizados: 2 });

    const result = await grants.commitNfcApproval(nfcInputFor(scene));

    expect(result).toEqual({ ok: false, reason: 'USOS_ESGOTADOS' });
    expect(await usesOf(scene)).toBe(2);
    expect(await prisma.accessEvent.count()).toBe(0);
  });

  it('deve devolver USOS_ESGOTADOS quando a autorização foi cancelada, sem deixar o evento', async () => {
    const scene = await seedScene({ situacao: 'CANCELADA' });

    const result = await grants.commitNfcApproval(nfcInputFor(scene));

    expect(result).toEqual({ ok: false, reason: 'USOS_ESGOTADOS' });
    expect(await usesOf(scene)).toBe(0);
    expect(await prisma.accessEvent.count()).toBe(0);
  });

  it('deve devolver CHAVE_REPETIDA, sem outro uso, quando a chave já pertence a um evento', async () => {
    const scene = await seedScene({ usosPermitidos: 3 });
    const key = newId();
    await grants.commitNfcApproval(nfcInputFor(scene, { clientEventId: key }));

    const again = await grants.commitNfcApproval(nfcInputFor(scene, { clientEventId: key }));

    expect(again).toEqual({ ok: false, reason: 'CHAVE_REPETIDA' });
    expect(await usesOf(scene)).toBe(1);
    expect(await prisma.accessEvent.count()).toBe(1);
  });

  it('deve preferir CHAVE_REPETIDA a USOS_ESGOTADOS: a chave é conferida antes dos usos', async () => {
    const scene = await seedScene({ usosPermitidos: 1 });
    const key = newId();
    await grants.commitNfcApproval(nfcInputFor(scene, { clientEventId: key }));

    // The only use is spent now; the retry must still be told it is a repeat, not a denial.
    const again = await grants.commitNfcApproval(nfcInputFor(scene, { clientEventId: key }));

    expect(again).toEqual({ ok: false, reason: 'CHAVE_REPETIDA' });
  });

  it('deve lançar e não consumir uso quando o evento não pode ser gravado', async () => {
    const scene = await seedScene({ usosPermitidos: 3 });
    const input = nfcInputFor(scene);
    // A terminal that does not exist breaks the foreign key of the event.
    input.event = { ...input.event, terminalId: newId() };

    await expect(grants.commitNfcApproval(input)).rejects.toThrow();

    expect(await usesOf(scene)).toBe(0);
    expect(await prisma.accessEvent.count()).toBe(0);
  });

  describe('concorrência', () => {
    it('vinte chamadas com a mesma chave: uma aprovada, dezenove CHAVE_REPETIDA, um uso e um evento', async () => {
      const scene = await seedScene({ usosPermitidos: 3 });
      const key = newId();

      const results = await Promise.all(
        Array.from({ length: 20 }, () =>
          grants.commitNfcApproval(nfcInputFor(scene, { clientEventId: key })),
        ),
      );

      expect(results.filter((r) => r.ok)).toHaveLength(1);
      expect(results.filter((r) => !r.ok).map((r) => (r.ok ? '' : r.reason))).toEqual(
        Array.from({ length: 19 }, () => 'CHAVE_REPETIDA'),
      );
      expect(await usesOf(scene)).toBe(1);
      expect(await prisma.accessEvent.count()).toBe(1);
    });

    it('vinte chamadas com a mesma chave e um só uso: nenhuma vira USOS_ESGOTADOS', async () => {
      const scene = await seedScene({ usosPermitidos: 1 });
      const key = newId();

      const results = await Promise.all(
        Array.from({ length: 20 }, () =>
          grants.commitNfcApproval(nfcInputFor(scene, { clientEventId: key })),
        ),
      );

      expect(results.filter((r) => r.ok)).toHaveLength(1);
      expect(results.filter((r) => !r.ok && r.reason === 'USOS_ESGOTADOS')).toHaveLength(0);
      expect(await usesOf(scene)).toBe(1);
    });

    it('oito chamadas com chaves diferentes e três usos: três aprovadas, cinco USOS_ESGOTADOS, três eventos', async () => {
      const scene = await seedScene({ usosPermitidos: 3 });

      const results = await Promise.all(
        Array.from({ length: 8 }, () => grants.commitNfcApproval(nfcInputFor(scene))),
      );

      expect(results.filter((r) => r.ok)).toHaveLength(3);
      expect(results.filter((r) => !r.ok && r.reason === 'USOS_ESGOTADOS')).toHaveLength(5);
      expect(await usesOf(scene)).toBe(3);
      expect(await prisma.accessEvent.count()).toBe(3);
    });
  });
});
