import { createHash, randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { NFC_DENIAL_REASONS, type NfcDenialReason } from '../../src/entities/DenialReason';
import { todayInSaoPaulo } from '../../src/entities/rules/todayInSaoPaulo';
import { createApp } from '../../src/main/app';
import {
  bearer,
  insertAccessPoint,
  insertAuthorization,
  insertNfcTag,
  insertTerminal,
  insertUser,
  prisma,
  resetDatabase,
} from './helpers';

const app = createApp();

const URL = '/api/v1/terminal/nfc';
const TERMINAL_KEY = 'chave-de-teste-do-terminal-0123456789abcdef';
const UID = '04A1B2C3D4';
const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

/** The calendar day `offset` days from today in São Paulo, as the UTC midnight a `date` column stores. */
const day = (offset: number) => {
  const [year, month, date] = todayInSaoPaulo(new Date()).split('-').map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(Date.UTC(year, month - 1, date + offset));
};

/** Hours that surely do not contain the current time in São Paulo (every window is a whole hour). */
const hoursAwayFromNow = () => {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(new Date()),
  );
  return hour < 12
    ? { horaInicio: '20:00', horaFim: '21:00' }
    : { horaInicio: '01:00', horaFim: '02:00' };
};

interface SceneOptions {
  user?: Partial<Parameters<typeof insertUser>[0]>;
  /** `null`: the user has no authorization at all. */
  authorization?: Partial<Parameters<typeof insertAuthorization>[0]> | null;
  /** `null`: no tag is registered. */
  tag?: Partial<Parameters<typeof insertNfcTag>[0]> | null;
  terminal?: Partial<Parameters<typeof insertTerminal>[0]>;
}

/** Everything valid: an active tag of an active user with a 3-use authorization for the terminal's point. */
async function seedScene({
  user = {},
  authorization = {},
  tag = {},
  terminal = {},
}: SceneOptions = {}) {
  const person = await insertUser(user);
  const accessPoint = await insertAccessPoint({ nome: 'Catraca Social' });
  const device = await insertTerminal({
    accessPointId: accessPoint.id,
    apiKeyHash: sha256(TERMINAL_KEY),
    ...terminal,
  });
  const grant =
    authorization === null
      ? null
      : await insertAuthorization({
          usuarioId: person.id,
          accessPointId: accessPoint.id,
          dataInicio: day(-1),
          dataFim: day(30),
          horaInicio: '00:00',
          horaFim: '23:59',
          usosPermitidos: 3,
          ...authorization,
        });
  const stored =
    tag === null ? null : await insertNfcTag({ usuarioId: person.id, uid: UID, ...tag });
  return { user: person, accessPoint, terminal: device, authorization: grant, tag: stored };
}

type Scene = Awaited<ReturnType<typeof seedScene>>;

const credentials = (terminalId: string, key: string = TERMINAL_KEY) => ({
  'X-Terminal-Id': terminalId,
  'X-Terminal-Key': key,
});

/** One read as the terminal sends it; a new `Idempotency-Key` each time unless the test passes one. */
const read = (
  scene: Scene,
  { body = {}, key = randomUUID() }: { body?: Record<string, unknown>; key?: string } = {},
) =>
  request(app)
    .post(URL)
    .set(credentials(scene.terminal.id))
    .set('Idempotency-Key', key)
    .send({ uid: UID, lidoEm: new Date().toISOString(), ...body });

const events = () => prisma.accessEvent.findMany({ orderBy: { ocorridoEm: 'asc' } });
const commands = () => prisma.terminalCommand.findMany();
const usesOf = async (scene: Scene) =>
  (await prisma.authorization.findUniqueOrThrow({ where: { id: scene.authorization!.id } }))
    .usosRealizados;

describe('POST /api/v1/terminal/nfc', () => {
  beforeEach(resetDatabase);

  describe('autenticação do terminal', () => {
    it('401 UNAUTHORIZED com chave errada, sem cabeçalhos ou só com um token de usuário', async () => {
      const scene = await seedScene();
      const admin = await insertUser({ perfil: 'ADMIN' });
      const body = { uid: UID };

      const wrongKey = await request(app)
        .post(URL)
        .set(credentials(scene.terminal.id, 'outra-chave'))
        .set('Idempotency-Key', randomUUID())
        .send(body);
      const noHeaders = await request(app)
        .post(URL)
        .set('Idempotency-Key', randomUUID())
        .send(body);
      const userToken = await request(app)
        .post(URL)
        .set('Authorization', bearer(admin))
        .set('Idempotency-Key', randomUUID())
        .send(body);

      for (const res of [wrongKey, noHeaders, userToken]) {
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHORIZED');
      }
      expect(await events()).toHaveLength(0);
      expect(await usesOf(scene)).toBe(0);
    });

    it('403 FORBIDDEN para terminal inativo com a chave certa, sem evento nem uso', async () => {
      const scene = await seedScene({ terminal: { ativo: false } });

      const res = await read(scene);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(await events()).toHaveLength(0);
      expect(await usesOf(scene)).toBe(0);
    });
  });

  describe('validação da entrada (422, sem evento e sem uso)', () => {
    const invalid: [string, Record<string, unknown>, string | undefined, string][] = [
      ['UID com caractere que não é hexadecimal', { uid: '04A1B2G3' }, undefined, 'uid'],
      ['UID com 7 caracteres', { uid: '04A1B2C' }, undefined, 'uid'],
      ['UID com 21 caracteres', { uid: '04A1B2C3D4E5F6A7B8C9D' }, undefined, 'uid'],
      ['UID ausente', { uid: undefined }, undefined, 'uid'],
      ['UID que não é texto', { uid: 4_000_000_000 }, undefined, 'uid'],
      ['lidoEm que não é um instante', { lidoEm: 'ontem' }, undefined, 'lidoEm'],
      ['Idempotency-Key fora do formato de UUID', {}, 'nao-e-um-uuid', 'Idempotency-Key'],
    ];

    it.each(invalid)('422 VALIDATION_ERROR para %s', async (_name, body, key, field) => {
      const scene = await seedScene();

      const res = await read(scene, { body, ...(key ? { key } : {}) });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.map((d: { field: string }) => d.field)).toContain(field);
      expect(await events()).toHaveLength(0);
      expect(await usesOf(scene)).toBe(0);
    });

    it('422 em Idempotency-Key quando o cabeçalho não vem', async () => {
      const scene = await seedScene();

      const res = await request(app)
        .post(URL)
        .set(credentials(scene.terminal.id))
        .send({ uid: UID });

      expect(res.status).toBe(422);
      expect(res.body.error.details).toEqual([
        { field: 'Idempotency-Key', message: expect.any(String) },
      ]);
    });

    it('422 quando o corpo vem vazio', async () => {
      const scene = await seedScene();

      const res = await request(app)
        .post(URL)
        .set(credentials(scene.terminal.id))
        .set('Idempotency-Key', randomUUID());

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('tag válida com autorização válida', () => {
    it('200 AUTORIZADO com aberturaMs, um uso consumido, um evento NFC e nenhum comando', async () => {
      const scene = await seedScene();
      const key = randomUUID();

      const res = await read(scene, { key });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ resultado: 'AUTORIZADO', aberturaMs: 5000 });
      expect(await usesOf(scene)).toBe(1);
      const stored = await events();
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({
        metodo: 'NFC',
        resultado: 'AUTORIZADO',
        motivo: null,
        terminalId: scene.terminal.id,
        accessPointId: scene.accessPoint.id,
        usuarioId: scene.user.id,
        authorizationId: scene.authorization!.id,
        distanciaM: null,
        clientEventId: key,
        detalhes: { uid: UID },
      });
      expect(await commands()).toHaveLength(0);
    });

    it('aceita o UID com separadores e minúsculas e grava o UID normalizado', async () => {
      const scene = await seedScene({ tag: { uid: '04A1B2C3' } });

      const res = await read(scene, { body: { uid: '04:a1:b2:c3' } });

      expect(res.body).toEqual({ resultado: 'AUTORIZADO', aberturaMs: 5000 });
      expect((await events())[0]?.detalhes).toEqual({ uid: '04A1B2C3' });
    });

    it('aceita a leitura sem lidoEm', async () => {
      const scene = await seedScene();

      const res = await request(app)
        .post(URL)
        .set(credentials(scene.terminal.id))
        .set('Idempotency-Key', randomUUID())
        .send({ uid: UID });

      expect(res.status).toBe(200);
      expect(res.body.resultado).toBe('AUTORIZADO');
    });

    it('responde em até 2 s', async () => {
      const scene = await seedScene();
      const startedAt = Date.now();

      const res = await read(scene);

      expect(res.status).toBe(200);
      expect(Date.now() - startedAt).toBeLessThan(2000);
    });
  });

  describe('negações: sempre 200, com o motivo certo e exatamente um evento', () => {
    const cases: {
      reason: NfcDenialReason;
      name: string;
      scene: () => Promise<Scene>;
      hasUser: boolean;
    }[] = [
      {
        reason: 'TAG_DESCONHECIDA',
        name: 'tag desconhecida',
        scene: () => seedScene({ tag: null }),
        hasUser: false,
      },
      {
        reason: 'TAG_INATIVA',
        name: 'tag desativada',
        scene: () => seedScene({ tag: { ativa: false } }),
        hasUser: true,
      },
      {
        reason: 'USUARIO_INATIVO',
        name: 'usuário inativo',
        scene: () => seedScene({ user: { ativo: false } }),
        hasUser: true,
      },
      {
        reason: 'SEM_AUTORIZACAO',
        name: 'sem autorização',
        scene: () => seedScene({ authorization: null }),
        hasUser: true,
      },
      {
        reason: 'SEM_AUTORIZACAO',
        name: 'autorização de outro local',
        scene: async () => {
          const otherPoint = await insertAccessPoint({ identificacao: 'OUTRA' });
          return seedScene({ authorization: { accessPointId: otherPoint.id } });
        },
        hasUser: true,
      },
      {
        reason: 'AUTORIZACAO_CANCELADA',
        name: 'autorização cancelada',
        scene: () => seedScene({ authorization: { situacao: 'CANCELADA' } }),
        hasUser: true,
      },
      {
        reason: 'FORA_DO_PERIODO',
        name: 'depois do fim do período',
        scene: () => seedScene({ authorization: { dataInicio: day(-10), dataFim: day(-1) } }),
        hasUser: true,
      },
      {
        reason: 'FORA_DO_PERIODO',
        name: 'antes do início do período',
        scene: () => seedScene({ authorization: { dataInicio: day(1), dataFim: day(10) } }),
        hasUser: true,
      },
      {
        reason: 'FORA_DO_PERIODO',
        name: 'dentro do período, fora do horário',
        scene: () => seedScene({ authorization: hoursAwayFromNow() }),
        hasUser: true,
      },
      {
        reason: 'USOS_ESGOTADOS',
        name: 'usos esgotados',
        scene: () => seedScene({ authorization: { usosRealizados: 3 } }),
        hasUser: true,
      },
    ];

    it('cobre os sete motivos de negação do NFC', () => {
      expect(new Set(cases.map((c) => c.reason))).toEqual(new Set(NFC_DENIAL_REASONS));
    });

    it.each(cases)('$name: NEGADO $reason', async ({ reason, scene: arrange, hasUser }) => {
      const scene = await arrange();
      const key = randomUUID();
      const spentBefore = scene.authorization?.usosRealizados ?? 0;

      const res = await read(scene, { key });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ resultado: 'NEGADO', motivo: reason });
      const stored = await events();
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({
        metodo: 'NFC',
        resultado: 'NEGADO',
        motivo: reason,
        usuarioId: hasUser ? scene.user.id : null,
        terminalId: scene.terminal.id,
        accessPointId: scene.accessPoint.id,
        authorizationId: null,
        clientEventId: key,
        detalhes: { uid: UID },
      });
      if (scene.authorization) expect(await usesOf(scene)).toBe(spentBefore);
      expect(await commands()).toHaveLength(0);
    });
  });

  describe('desativar a tag impede o uso', () => {
    it('depois do PATCH ativa=false a leitura é NEGADO TAG_INATIVA', async () => {
      const scene = await seedScene();
      const admin = await insertUser({ perfil: 'ADMIN' });

      const patch = await request(app)
        .patch(`/api/v1/nfc-tags/${scene.tag!.id}`)
        .set('Authorization', bearer(admin))
        .send({ ativa: false });
      const res = await read(scene);

      expect(patch.status).toBe(200);
      expect(res.body).toEqual({ resultado: 'NEGADO', motivo: 'TAG_INATIVA' });
      expect(await usesOf(scene)).toBe(0);
    });
  });

  describe('idempotência da Idempotency-Key', () => {
    it('repetir a mesma chave devolve a mesma resposta, sem outro uso e sem outro evento', async () => {
      const scene = await seedScene();
      const key = randomUUID();

      const first = await read(scene, { key });
      const again = await read(scene, { key });

      expect(again.status).toBe(200);
      expect(again.body).toEqual(first.body);
      expect(await usesOf(scene)).toBe(1);
      expect(await events()).toHaveLength(1);
    });

    it('a chave escrita em maiúsculas é a mesma chave', async () => {
      const scene = await seedScene();
      const key = randomUUID();

      await read(scene, { key });
      const again = await read(scene, { key: key.toUpperCase() });

      expect(again.body).toEqual({ resultado: 'AUTORIZADO', aberturaMs: 5000 });
      expect(await usesOf(scene)).toBe(1);
      expect(await events()).toHaveLength(1);
    });

    it('repetir a chave de uma negação devolve a mesma negação, com um só evento', async () => {
      const scene = await seedScene({ tag: null });
      const key = randomUUID();

      await read(scene, { key });
      const again = await read(scene, { key });

      expect(again.body).toEqual({ resultado: 'NEGADO', motivo: 'TAG_DESCONHECIDA' });
      expect(await events()).toHaveLength(1);
    });

    it('409 CONFLICT quando a chave já foi usada por outro terminal, sem tocar em nada', async () => {
      const scene = await seedScene();
      const other = await seedScene({ tag: { uid: '04FFEEDD' } });
      const key = randomUUID();
      await read(scene, { key });

      const res = await request(app)
        .post(URL)
        .set(credentials(other.terminal.id))
        .set('Idempotency-Key', key)
        .send({ uid: '04FFEEDD' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(await events()).toHaveLength(1);
      expect(await usesOf(other)).toBe(0);
    });
  });

  describe('debounce da mesma tag no mesmo terminal (NFC_DEBOUNCE_SECONDS = 5 nos testes)', () => {
    /** An earlier read of the same tag at this terminal, `ageMs` ago, that denied it. */
    const earlierRead = (scene: Scene, ageMs: number) =>
      prisma.accessEvent.create({
        data: {
          terminalId: scene.terminal.id,
          accessPointId: scene.accessPoint.id,
          usuarioId: scene.user.id,
          metodo: 'NFC',
          resultado: 'NEGADO',
          motivo: 'TAG_INATIVA',
          ocorridoEm: new Date(Date.now() - ageMs),
          detalhes: { uid: UID },
        },
      });

    it('uma leitura 4 s depois da anterior repete a decisão dela, sem uso e sem evento novo', async () => {
      // A fresh evaluation would authorize: only the earlier read explains a denial.
      const scene = await seedScene();
      await earlierRead(scene, 4000);

      const res = await read(scene);

      expect(res.body).toEqual({ resultado: 'NEGADO', motivo: 'TAG_INATIVA' });
      expect(await events()).toHaveLength(1);
      expect(await usesOf(scene)).toBe(0);
    });

    it('uma leitura 6 s depois da anterior é uma nova tentativa', async () => {
      const scene = await seedScene();
      await earlierRead(scene, 6000);

      const res = await read(scene);

      expect(res.body).toEqual({ resultado: 'AUTORIZADO', aberturaMs: 5000 });
      expect(await events()).toHaveLength(2);
      expect(await usesOf(scene)).toBe(1);
    });

    it('a leitura anterior de outra tag não conta', async () => {
      const scene = await seedScene();
      await prisma.accessEvent.create({
        data: {
          terminalId: scene.terminal.id,
          accessPointId: scene.accessPoint.id,
          metodo: 'NFC',
          resultado: 'NEGADO',
          motivo: 'TAG_DESCONHECIDA',
          ocorridoEm: new Date(Date.now() - 1000),
          detalhes: { uid: '04FFEEDD' },
        },
      });

      const res = await read(scene);

      expect(res.body.resultado).toBe('AUTORIZADO');
    });
  });

  describe('modo de cadastro do terminal', () => {
    const enable = (scene: Scene, admin: Parameters<typeof bearer>[0], usuarioId: string) =>
      request(app)
        .post(`/api/v1/terminals/${scene.terminal.id}/enroll-mode`)
        .set('Authorization', bearer(admin))
        .send({ usuarioId });

    it('vincula a tag ao usuário combinado, responde CADASTRADA e não registra acesso', async () => {
      const scene = await seedScene({ tag: null });
      const admin = await insertUser({ perfil: 'ADMIN' });
      expect((await enable(scene, admin, scene.user.id)).status).toBe(200);

      const res = await read(scene, { body: { uid: '04:a1:b2:c3:d4' } });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ resultado: 'CADASTRADA' });
      const list = await request(app)
        .get(`/api/v1/nfc-tags?usuarioId=${scene.user.id}`)
        .set('Authorization', bearer(admin));
      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0]).toMatchObject({ uid: UID, usuarioId: scene.user.id, ativa: true });
      expect(await events()).toHaveLength(0);
      expect(await usesOf(scene)).toBe(0);
      expect(await commands()).toHaveLength(0);
    });

    it('a leitura seguinte já segue o fluxo normal com a tag recém-vinculada', async () => {
      const scene = await seedScene({ tag: null });
      const admin = await insertUser({ perfil: 'ADMIN' });
      await enable(scene, admin, scene.user.id);
      await read(scene);

      const next = await read(scene);

      expect(next.body).toEqual({ resultado: 'AUTORIZADO', aberturaMs: 5000 });
      expect(await usesOf(scene)).toBe(1);
      expect(await events()).toHaveLength(1);
      const device = await prisma.terminal.findUniqueOrThrow({ where: { id: scene.terminal.id } });
      expect(device.modoCadastroUsuarioId).toBeNull();
      expect(device.modoCadastroAte).toBeNull();
    });

    it('409 TAG_JA_CADASTRADA quando o UID já existe, e o modo fica gasto', async () => {
      const scene = await seedScene();
      const admin = await insertUser({ perfil: 'ADMIN' });
      await enable(scene, admin, scene.user.id);

      const res = await read(scene);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('TAG_JA_CADASTRADA');
      const device = await prisma.terminal.findUniqueOrThrow({ where: { id: scene.terminal.id } });
      expect(device.modoCadastroUsuarioId).toBeNull();
      expect(await events()).toHaveLength(0);
    });

    it('com o modo vencido a leitura segue o fluxo normal', async () => {
      const scene = await seedScene({
        tag: null,
        terminal: { modoCadastroAte: new Date(Date.now() - 1000) },
      });
      await prisma.terminal.update({
        where: { id: scene.terminal.id },
        data: { modoCadastroUsuarioId: scene.user.id },
      });

      const res = await read(scene);

      expect(res.body).toEqual({ resultado: 'NEGADO', motivo: 'TAG_DESCONHECIDA' });
      expect(await prisma.nfcTag.count()).toBe(0);
    });
  });

  describe('concorrência', () => {
    it('duas tags do mesmo usuário lidas ao mesmo tempo com um uso restante: uma AUTORIZADO e uma USOS_ESGOTADOS', async () => {
      const scene = await seedScene({ authorization: { usosPermitidos: 1 } });
      await insertNfcTag({ usuarioId: scene.user.id, uid: '04FFEEDD' });

      const [a, b] = await Promise.all([read(scene), read(scene, { body: { uid: '04FFEEDD' } })]);

      expect([a.body, b.body]).toEqual(
        expect.arrayContaining([
          { resultado: 'AUTORIZADO', aberturaMs: 5000 },
          { resultado: 'NEGADO', motivo: 'USOS_ESGOTADOS' },
        ]),
      );
      expect(await usesOf(scene)).toBe(1);
      expect((await events()).map((e) => e.resultado).sort()).toEqual(['AUTORIZADO', 'NEGADO']);
    });

    it('oito tags do mesmo usuário lidas ao mesmo tempo com três usos: três AUTORIZADO, cinco USOS_ESGOTADOS, oito eventos', async () => {
      const scene = await seedScene({ tag: null });
      const uids = Array.from({ length: 8 }, (_, i) => `04A1B2C${i}D4`);
      for (const uid of uids) await insertNfcTag({ usuarioId: scene.user.id, uid });

      const results = await Promise.all(uids.map((uid) => read(scene, { body: { uid } })));

      const granted = results.filter((r) => r.body.resultado === 'AUTORIZADO');
      const denied = results.filter((r) => r.body.resultado === 'NEGADO');
      expect(granted).toHaveLength(3);
      expect(denied.map((r) => r.body.motivo)).toEqual(
        Array.from({ length: 5 }, () => 'USOS_ESGOTADOS'),
      );
      expect(await usesOf(scene)).toBe(3);
      expect(await events()).toHaveLength(8);
    });

    it('oito leituras com a mesma chave e três usos: todas AUTORIZADO, um uso e um evento', async () => {
      const scene = await seedScene();
      const key = randomUUID();

      const results = await Promise.all(Array.from({ length: 8 }, () => read(scene, { key })));

      expect(results.map((r) => r.status)).toEqual(Array.from({ length: 8 }, () => 200));
      expect(results.map((r) => r.body)).toEqual(
        Array.from({ length: 8 }, () => ({ resultado: 'AUTORIZADO', aberturaMs: 5000 })),
      );
      expect(await usesOf(scene)).toBe(1);
      expect(await events()).toHaveLength(1);
    });

    it('oito leituras com a mesma chave e um só uso restante: todas AUTORIZADO, nenhuma vira USOS_ESGOTADOS', async () => {
      const scene = await seedScene({ authorization: { usosPermitidos: 1 } });
      const key = randomUUID();

      const results = await Promise.all(Array.from({ length: 8 }, () => read(scene, { key })));

      expect(results.map((r) => r.body.resultado)).toEqual(
        Array.from({ length: 8 }, () => 'AUTORIZADO'),
      );
      expect(await usesOf(scene)).toBe(1);
      expect(await events()).toHaveLength(1);
    });

    it('a mesma tag lida duas vezes ao mesmo tempo, com chaves diferentes e um uso: nunca consome mais de um', async () => {
      const scene = await seedScene({ authorization: { usosPermitidos: 1 } });

      const results = await Promise.all([read(scene), read(scene)]);

      // Depending on who reaches the debounce first the second read is its own attempt (USOS_ESGOTADOS)
      // or a repeat of the first; either way one use is spent and nobody else gets in.
      expect(await usesOf(scene)).toBe(1);
      const answers = results.map((r) => JSON.stringify(r.body));
      expect(answers.filter((a) => a.includes('AUTORIZADO'))).not.toHaveLength(0);
      for (const r of results) {
        expect(
          r.body.resultado === 'AUTORIZADO' ||
            (r.body.resultado === 'NEGADO' && r.body.motivo === 'USOS_ESGOTADOS'),
        ).toBe(true);
      }
    });
  });
});
