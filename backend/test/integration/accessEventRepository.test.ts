import { beforeEach, describe, expect, it } from 'vitest';
import { AccessEvent } from '../../src/entities/AccessEvent';
import { PrismaAccessEventRepository } from '../../src/infra/repositories/PrismaAccessEventRepository';
import type { Prisma } from '../../src/generated/prisma/client';
import {
  expectViolation,
  insertAccessPoint,
  insertAuthorization,
  insertTerminal,
  insertUser,
  newId,
  prisma,
  resetDatabase,
} from './helpers';

const events = new PrismaAccessEventRepository(prisma);

const T0 = new Date('2026-10-20T14:32:07.123Z');

describe('PrismaAccessEventRepository', () => {
  beforeEach(resetDatabase);

  describe('append', () => {
    it('grava um evento AUTORIZADO com todos os campos', async () => {
      const accessPoint = await insertAccessPoint();
      const terminal = await insertTerminal({ accessPointId: accessPoint.id });
      const user = await insertUser();
      const authorization = await insertAuthorization({
        usuarioId: user.id,
        accessPointId: accessPoint.id,
      });
      const event = AccessEvent.approved({
        id: newId(),
        ocorridoEm: T0,
        metodo: 'QR',
        terminalId: terminal.id,
        accessPointId: accessPoint.id,
        usuarioId: user.id,
        authorizationId: authorization.id,
        distanciaM: 14.25,
        precisaoMetros: 12.5,
      });

      await events.append(event);

      const row = await prisma.accessEvent.findUniqueOrThrow({ where: { id: event.id } });
      expect(row).toEqual(event);
      expect(row.detalhes).toEqual({ precisaoMetros: 12.5 });
    });

    it('grava a negação de uma credencial desconhecida sem terminal nem ponto, só com o prefixo do hash', async () => {
      const user = await insertUser();
      const hash = 'abcdef0123456789'.repeat(4);
      const event = AccessEvent.denied({
        id: newId(),
        ocorridoEm: T0,
        metodo: 'QR',
        usuarioId: user.id,
        motivo: 'CREDENCIAL_INVALIDA',
        credencialHash: hash,
      });

      await events.append(event);

      const row = await prisma.accessEvent.findUniqueOrThrow({ where: { id: event.id } });
      expect(row).toMatchObject({
        resultado: 'NEGADO',
        motivo: 'CREDENCIAL_INVALIDA',
        terminalId: null,
        accessPointId: null,
        authorizationId: null,
        usuarioId: user.id,
        detalhes: { credencialHashPrefixo: 'abcdef01' },
      });
      expect(JSON.stringify(row)).not.toContain(hash);
    });

    it('grava detalhes nulo como NULL do banco, não como o JSON null', async () => {
      const event = AccessEvent.denied({
        id: newId(),
        ocorridoEm: T0,
        metodo: 'NFC',
        motivo: 'TAG_DESCONHECIDA',
      });

      await events.append(event);

      const [raw] = await prisma.$queryRaw<{ isNull: boolean }[]>`
        SELECT detalhes IS NULL AS "isNull" FROM access_events WHERE id = ${event.id}::uuid`;
      expect(raw?.isNull).toBe(true);
    });

    it('recusa o evento de um terminal que não existe e não grava nada', async () => {
      const event = AccessEvent.denied({
        id: newId(),
        ocorridoEm: T0,
        metodo: 'QR',
        terminalId: newId(),
        motivo: 'DISTANTE_DO_TERMINAL',
      });

      await expectViolation(events.append(event), 'access_events_terminalId_fkey');

      expect(await prisma.accessEvent.count()).toBe(0);
    });

    it('roda dentro de uma transação: um erro depois do append desfaz a gravação', async () => {
      const event = AccessEvent.denied({
        id: newId(),
        ocorridoEm: T0,
        metodo: 'QR',
        motivo: 'CREDENCIAL_EXPIRADA',
      });

      await expect(
        prisma.$transaction(async (tx) => {
          await new PrismaAccessEventRepository(tx).append(event);
          throw new Error('falha depois do evento');
        }),
      ).rejects.toThrow('falha depois do evento');

      expect(await prisma.accessEvent.count()).toBe(0);
    });

    it('roda dentro de uma transação: o append que falha desfaz a escrita anterior', async () => {
      const user = await insertUser();
      const valid = AccessEvent.denied({
        id: newId(),
        ocorridoEm: T0,
        metodo: 'QR',
        usuarioId: user.id,
        motivo: 'CREDENCIAL_EXPIRADA',
      });
      const invalid = AccessEvent.denied({
        id: newId(),
        ocorridoEm: T0,
        metodo: 'QR',
        terminalId: newId(),
        motivo: 'DISTANTE_DO_TERMINAL',
      });

      await expectViolation(
        prisma.$transaction(async (tx) => {
          const inTransaction = new PrismaAccessEventRepository(tx);
          await inTransaction.append(valid);
          await inTransaction.append(invalid);
        }),
        'access_events_terminalId_fkey',
      );

      expect(await prisma.accessEvent.count()).toBe(0);
    });
  });
});

describe('PrismaAccessEventRepository: consultas do NFC', () => {
  beforeEach(resetDatabase);

  const UID = '04A1B2C3D4';
  const KEY = '3f1c9a52-8e0b-4f55-9d57-2a6f0c1d7e44';

  async function seedTerminal() {
    const accessPoint = await insertAccessPoint();
    const terminal = await insertTerminal({ accessPointId: accessPoint.id });
    return { accessPoint, terminal };
  }

  /** An NFC read denied at `at`, as the use case stores it. */
  const nfcEvent = (
    scene: Awaited<ReturnType<typeof seedTerminal>>,
    at: Date,
    overrides: Partial<Parameters<typeof AccessEvent.denied>[0]> = {},
  ) =>
    AccessEvent.denied({
      id: newId(),
      ocorridoEm: at,
      metodo: 'NFC',
      terminalId: scene.terminal.id,
      accessPointId: scene.accessPoint.id,
      motivo: 'TAG_DESCONHECIDA',
      uid: UID,
      ...overrides,
    });

  describe('findByClientEventId', () => {
    it('devolve o evento gravado com a chave, com todos os campos', async () => {
      const scene = await seedTerminal();
      const event = nfcEvent(scene, T0, { clientEventId: KEY });
      await events.append(event);

      expect(await events.findByClientEventId(KEY)).toEqual(event);
    });

    it('devolve null para uma chave que nenhum evento tem', async () => {
      expect(await events.findByClientEventId(KEY)).toBeNull();
    });

    it('recusa um segundo evento com a mesma chave, pelo índice único', async () => {
      const scene = await seedTerminal();
      await events.append(nfcEvent(scene, T0, { clientEventId: KEY }));

      await expectViolation(
        events.append(nfcEvent(scene, T0, { clientEventId: KEY })),
        'access_events_clientEventId_key',
      );
      expect(await prisma.accessEvent.count()).toBe(1);
    });
  });

  describe('findRecentNfc', () => {
    const since = new Date(T0.getTime() - 3000);

    it('devolve a leitura mais recente da mesma tag no mesmo terminal depois de since', async () => {
      const scene = await seedTerminal();
      await events.append(nfcEvent(scene, new Date(T0.getTime() - 2500)));
      const newest = nfcEvent(scene, new Date(T0.getTime() - 500));
      await events.append(newest);
      await events.append(nfcEvent(scene, new Date(T0.getTime() - 1500)));

      const found = await events.findRecentNfc({ terminalId: scene.terminal.id, uid: UID, since });

      expect(found).toEqual(newest);
    });

    it('trata since como exclusivo: o evento exatamente em since não é recente, 1 ms depois é', async () => {
      const scene = await seedTerminal();
      await events.append(nfcEvent(scene, since));

      expect(
        await events.findRecentNfc({ terminalId: scene.terminal.id, uid: UID, since }),
      ).toBeNull();

      const justAfter = nfcEvent(scene, new Date(since.getTime() + 1));
      await events.append(justAfter);
      expect(
        await events.findRecentNfc({ terminalId: scene.terminal.id, uid: UID, since }),
      ).toEqual(justAfter);
    });

    it('compara o UID inteiro: nem um prefixo nem outra tag contam', async () => {
      const scene = await seedTerminal();
      await events.append(nfcEvent(scene, new Date(T0.getTime() - 500), { uid: '04A1B2C3' }));
      await events.append(nfcEvent(scene, new Date(T0.getTime() - 400), { uid: '04A1B2C3D4E5' }));

      expect(
        await events.findRecentNfc({ terminalId: scene.terminal.id, uid: UID, since }),
      ).toBeNull();
    });

    it('ignora o evento de outro terminal', async () => {
      const scene = await seedTerminal();
      const other = await seedTerminal();
      await events.append(nfcEvent(other, new Date(T0.getTime() - 500)));

      expect(
        await events.findRecentNfc({ terminalId: scene.terminal.id, uid: UID, since }),
      ).toBeNull();
    });

    it('ignora o evento de QR, mesmo com um uid em detalhes, e o evento sem detalhes', async () => {
      const scene = await seedTerminal();
      await events.append(nfcEvent(scene, new Date(T0.getTime() - 500), { metodo: 'QR' }));
      await events.append(nfcEvent(scene, new Date(T0.getTime() - 400), { uid: null }));

      expect(
        await events.findRecentNfc({ terminalId: scene.terminal.id, uid: UID, since }),
      ).toBeNull();
    });

    describe('eventos de um lote offline (B19)', () => {
      const offline = (scene: Awaited<ReturnType<typeof seedTerminal>>, at: Date) =>
        nfcEvent(scene, at, { motivo: 'TERMINAL_OFFLINE', clientEventId: newId() });

      it('ignora o evento TERMINAL_OFFLINE recente do mesmo UID e do mesmo terminal', async () => {
        const scene = await seedTerminal();
        await events.append(offline(scene, new Date(T0.getTime() - 500)));

        expect(
          await events.findRecentNfc({ terminalId: scene.terminal.id, uid: UID, since }),
        ).toBeNull();
      });

      it('ignora o evento TERMINAL_OFFLINE com data adiantada em relação ao servidor', async () => {
        const scene = await seedTerminal();
        await events.append(offline(scene, new Date(T0.getTime() + 4 * 60 * 1000)));

        expect(
          await events.findRecentNfc({ terminalId: scene.terminal.id, uid: UID, since }),
        ).toBeNull();
      });

      it('devolve a leitura ao vivo mais antiga quando há um evento offline mais novo', async () => {
        const scene = await seedTerminal();
        const live = nfcEvent(scene, new Date(T0.getTime() - 2000));
        await events.append(live);
        await events.append(offline(scene, new Date(T0.getTime() - 500)));

        const found = await events.findRecentNfc({
          terminalId: scene.terminal.id,
          uid: UID,
          since,
        });

        expect(found).toEqual(live);
      });

      it('continua devolvendo a leitura aprovada, que não tem motivo (NULL no SQL)', async () => {
        const scene = await seedTerminal();
        const user = await insertUser();
        const authorization = await insertAuthorization({
          usuarioId: user.id,
          accessPointId: scene.accessPoint.id,
        });
        const approved = AccessEvent.approved({
          id: newId(),
          ocorridoEm: new Date(T0.getTime() - 500),
          metodo: 'NFC',
          terminalId: scene.terminal.id,
          accessPointId: scene.accessPoint.id,
          usuarioId: user.id,
          authorizationId: authorization.id,
          uid: UID,
        });
        await events.append(approved);

        const found = await events.findRecentNfc({
          terminalId: scene.terminal.id,
          uid: UID,
          since,
        });

        expect(found).toEqual(approved);
      });
    });
  });
});

describe('PrismaAccessEventRepository: appendIfAbsent', () => {
  beforeEach(resetDatabase);

  const key = (n: number) => `3f1c9a52-8e0b-4f55-9d57-${String(n).padStart(12, '0')}`;

  async function seedTerminal() {
    const accessPoint = await insertAccessPoint();
    const terminal = await insertTerminal({ accessPointId: accessPoint.id });
    return { accessPoint, terminal };
  }

  /** What IngestOfflineEvents stores: a denial with the terminal's own clock and the client's key. */
  const offlineEvent = (
    scene: Awaited<ReturnType<typeof seedTerminal>>,
    n: number,
    overrides: Partial<Parameters<typeof AccessEvent.denied>[0]> = {},
  ) =>
    AccessEvent.denied({
      id: newId(),
      ocorridoEm: new Date(T0.getTime() - n * 1000),
      metodo: 'NFC',
      terminalId: scene.terminal.id,
      accessPointId: scene.accessPoint.id,
      motivo: 'TERMINAL_OFFLINE',
      clientEventId: key(n),
      uid: '04A1B2C3',
      ...overrides,
    });

  it('grava todos os eventos novos, com todos os campos, e devolve quantos gravou', async () => {
    const scene = await seedTerminal();
    const user = await insertUser();
    const batch = [offlineEvent(scene, 1, { usuarioId: user.id }), offlineEvent(scene, 2)];

    const stored = await events.appendIfAbsent(batch);

    expect(stored).toBe(2);
    const rows = await prisma.accessEvent.findMany({ orderBy: { clientEventId: 'asc' } });
    expect(rows).toEqual(batch);
  });

  it('pula o evento cuja chave já existe, sem alterar o que estava gravado, e conta só os novos', async () => {
    const scene = await seedTerminal();
    const original = offlineEvent(scene, 1);
    await events.appendIfAbsent([original]);

    const stored = await events.appendIfAbsent([
      offlineEvent(scene, 1, { ocorridoEm: T0, uid: 'AABBCCDD' }),
      offlineEvent(scene, 2),
    ]);

    expect(stored).toBe(1);
    expect(await prisma.accessEvent.count()).toBe(2);
    expect(await prisma.accessEvent.findUniqueOrThrow({ where: { id: original.id } })).toEqual(
      original,
    );
  });

  it('grava só o primeiro quando a mesma chave se repete dentro da lista', async () => {
    const scene = await seedTerminal();
    const first = offlineEvent(scene, 1);

    const stored = await events.appendIfAbsent([first, offlineEvent(scene, 1)]);

    expect(stored).toBe(1);
    const rows = await prisma.accessEvent.findMany();
    expect(rows).toEqual([first]);
  });

  it('devolve 0 e não falha com uma lista vazia', async () => {
    expect(await events.appendIfAbsent([])).toBe(0);
  });

  it('grava cada evento uma única vez quando vários envios da mesma lista chegam ao mesmo tempo', async () => {
    const scene = await seedTerminal();
    const batch = Array.from({ length: 10 }, (_, i) => offlineEvent(scene, i + 1));

    // Every call builds new ids for the same keys, as every resend of a batch does.
    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        events.appendIfAbsent(batch.map((event) => ({ ...event, id: newId() }))),
      ),
    );

    expect(results.reduce((sum, stored) => sum + stored, 0)).toBe(10);
    expect(await prisma.accessEvent.count()).toBe(10);
  });

  it('não dá deadlock quando dois envios simultâneos trazem as mesmas chaves em ordens opostas', async () => {
    const scene = await seedTerminal();
    const rounds = 30;

    for (let round = 0; round < rounds; round += 1) {
      // New keys every round, 50 per batch (the most a request carries), the second batch reversed.
      const ascending = Array.from({ length: 50 }, (_, i) =>
        offlineEvent(scene, round * 100 + i + 1),
      );
      const descending = [...ascending].reverse().map((event) => ({ ...event, id: newId() }));

      const results = await Promise.allSettled([
        events.appendIfAbsent(ascending),
        events.appendIfAbsent(descending),
      ]);

      // A rejection shows its reason in the failure message instead of a bare "rejected".
      expect(
        results.map((result) =>
          result.status === 'fulfilled' ? 'fulfilled' : String(result.reason),
        ),
      ).toEqual(['fulfilled', 'fulfilled']);
      const stored = results.reduce(
        (sum, result) => sum + (result.status === 'fulfilled' ? result.value : 0),
        0,
      );
      expect(stored).toBe(50);
    }
    expect(await prisma.accessEvent.count()).toBe(rounds * 50);
  });

  it('não grava nada de um evento com a chave já usada por uma leitura ao vivo', async () => {
    const scene = await seedTerminal();
    const live = offlineEvent(scene, 1, { motivo: 'TAG_DESCONHECIDA' });
    await events.append(live);

    const stored = await events.appendIfAbsent([offlineEvent(scene, 1)]);

    expect(stored).toBe(0);
    expect(await prisma.accessEvent.findUniqueOrThrow({ where: { id: live.id } })).toEqual(live);
  });
});

describe('PrismaAccessEventRepository: list', () => {
  beforeEach(resetDatabase);

  const insert = (overrides: Partial<Prisma.AccessEventUncheckedCreateInput> = {}) =>
    prisma.accessEvent.create({
      data: { ocorridoEm: T0, metodo: 'QR', resultado: 'AUTORIZADO', ...overrides },
    });

  it('desempata os eventos do mesmo instante pelo id, do maior para o menor, sem repetir nem pular na paginação', async () => {
    const rows = [];
    for (let i = 0; i < 5; i++) rows.push(await insert());
    const expected = rows
      .map((row) => row.id)
      .sort()
      .reverse();

    const first = await events.list({ page: 1, pageSize: 2 });
    const second = await events.list({ page: 2, pageSize: 2 });
    const third = await events.list({ page: 3, pageSize: 2 });

    const paged = [...first.items, ...second.items, ...third.items].map((item) => item.id);
    expect(paged).toEqual(expected);
    expect(first.total).toBe(5);
  });

  it('lista o evento que não tem pessoa, ponto, terminal nem autorização', async () => {
    const orphan = await insert({
      resultado: 'NEGADO',
      motivo: 'CREDENCIAL_INVALIDA',
      detalhes: { credencialHashPrefixo: 'abcd1234' },
    });

    const { items, total } = await events.list({ page: 1, pageSize: 20 });

    expect(total).toBe(1);
    expect(items).toEqual([
      {
        id: orphan.id,
        ocorridoEm: T0,
        metodo: 'QR',
        resultado: 'NEGADO',
        motivo: 'CREDENCIAL_INVALIDA',
        distanciaM: null,
        authorizationId: null,
        usuario: null,
        local: null,
        terminal: null,
      },
    ]);
  });

  it('conta o total depois dos filtros, não da página', async () => {
    const user = await insertUser();
    for (let i = 0; i < 3; i++) await insert({ usuarioId: user.id });
    await insert();

    const { items, total } = await events.list({ page: 1, pageSize: 2, usuarioId: user.id });

    expect(items).toHaveLength(2);
    expect(total).toBe(3);
  });

  it('lê dentro de uma transação, como o resto do repositório', async () => {
    const inserted = await insert();

    const found = await prisma.$transaction((tx) =>
      new PrismaAccessEventRepository(tx).list({ page: 1, pageSize: 20 }),
    );

    expect(found.items.map((item) => item.id)).toEqual([inserted.id]);
  });
});
