import { createHash, randomBytes } from 'node:crypto';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { QR_DENIAL_REASONS, type QrDenialReason } from '../../src/entities/DenialReason';
import { todayInSaoPaulo } from '../../src/entities/rules/todayInSaoPaulo';
import { createApp } from '../../src/main/app';
import { container } from '../../src/main/container';
import { QR_DENIAL_MESSAGES, QR_GRANTED_MESSAGE } from '../../src/useCases/Access/qrDenialMessages';
import {
  bearer,
  expiredTokenFor,
  insertAccessPoint,
  insertAuthorization,
  insertQrCredential,
  insertTerminal,
  insertUser,
  prisma,
  resetDatabase,
} from './helpers';

const app = createApp();
// Outside production the 500 body carries the stack; this one proves what a real deployment answers.
const productionApp = createApp({ isProduction: true });

const URL = '/api/v1/access/qr/validate';
const TERMINAL_KEY = 'chave-de-teste-do-terminal-0123456789abcdef';
const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
/** A token as the terminal issues them: 16 random bytes in base64url, 22 characters. */
const newToken = () => randomBytes(16).toString('base64url');

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

type Overrides<T> = Partial<T>;

interface SceneOptions {
  user?: Overrides<Parameters<typeof insertUser>[0]>;
  /** `null`: the user has no authorization at all. */
  authorization?: Overrides<Parameters<typeof insertAuthorization>[0]> | null;
  credential?: Overrides<Parameters<typeof insertQrCredential>[0]>;
  terminal?: Overrides<Parameters<typeof insertTerminal>[0]>;
}

/** Everything valid: an active user with a 3-use authorization for the point, and a QR read 3 s after it was issued. */
async function seedScene({
  user = {},
  authorization = {},
  credential = {},
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
  const token = newToken();
  const now = Date.now();
  const stored = await insertQrCredential({
    terminalId: device.id,
    tokenHash: sha256(token),
    emitidoEm: new Date(now - 3000),
    expiraEm: new Date(now + 12_000),
    ...credential,
  });
  return {
    user: person,
    accessPoint,
    terminal: device,
    authorization: grant,
    credential: stored,
    token,
    payload: `ACS1:${token}`,
  };
}

type Scene = Awaited<ReturnType<typeof seedScene>>;

/** Where the access point is registered: the phone is right at the terminal. */
const here = { latitude: -23.30512, longitude: -45.96551 };

const validate = (scene: Scene, body: Record<string, unknown> = {}) =>
  request(app)
    .post(URL)
    .set('Authorization', bearer(scene.user))
    .send({ payload: scene.payload, ...here, ...body });

const events = () => prisma.accessEvent.findMany({ orderBy: { ocorridoEm: 'asc' } });
const commands = () => prisma.terminalCommand.findMany({ orderBy: { id: 'asc' } });
const usesOf = async (scene: Scene) =>
  (await prisma.authorization.findUniqueOrThrow({ where: { id: scene.authorization!.id } }))
    .usosRealizados;
const isConsumed = async (scene: Scene) =>
  (await prisma.qrCredential.findUniqueOrThrow({ where: { id: scene.credential.id } }))
    .consumidoEm !== null;

const dropFailingTrigger = async () => {
  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS test_fail_event_insert ON access_events');
  await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS test_fail_event_insert()');
};

/** Makes the database refuse to store events of the given result, like a disk that filled up. */
const failEventInserts = async (resultado: 'AUTORIZADO' | 'NEGADO') => {
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION test_fail_event_insert() RETURNS trigger AS $$
    BEGIN RAISE EXCEPTION 'falha injetada pelo teste'; END; $$ LANGUAGE plpgsql`);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER test_fail_event_insert BEFORE INSERT ON access_events
    FOR EACH ROW WHEN (NEW.resultado = '${resultado}') EXECUTE FUNCTION test_fail_event_insert()`);
};

describe('POST /api/v1/access/qr/validate', () => {
  beforeEach(async () => {
    await dropFailingTrigger();
    await resetDatabase();
  });
  afterEach(dropFailingTrigger);

  describe('caso 1: aprovação', () => {
    it('200 com o resultado, a mensagem, o local, os usos restantes, a distância e o instante', async () => {
      const scene = await seedScene();
      const before = Date.now();

      const res = await validate(scene);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        resultado: 'AUTORIZADO',
        mensagem: QR_GRANTED_MESSAGE,
        local: { nome: 'Catraca Social' },
        usosRestantes: 2,
        distanciaM: 0,
        ocorridoEm: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/),
      });
      expect(Math.abs(Date.parse(res.body.ocorridoEm) - before)).toBeLessThan(5000);
    });

    it('arredonda a distância ao metro na resposta e guarda a exata no evento', async () => {
      const scene = await seedScene();

      // About 99 m north of the registered position.
      const res = await validate(scene, { latitude: -23.30422967 });

      expect(res.status).toBe(200);
      expect(res.body.distanciaM).toBe(99);
      const [event] = await events();
      expect(event?.distanciaM).toBeGreaterThan(98.9);
      expect(event?.distanciaM).toBeLessThan(99.1);
      expect(Number.isInteger(event?.distanciaM)).toBe(false);
    });

    it('consome a credencial e um uso, grava um evento AUTORIZADO e cria o comando ABRIR', async () => {
      const scene = await seedScene();

      await validate(scene, { precisaoMetros: 12.5 });

      expect(await usesOf(scene)).toBe(1);
      expect(
        await prisma.qrCredential.findUniqueOrThrow({ where: { id: scene.credential.id } }),
      ).toMatchObject({ consumidoPorId: scene.user.id });
      expect(await isConsumed(scene)).toBe(true);
      const stored = await events();
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({
        metodo: 'QR',
        resultado: 'AUTORIZADO',
        motivo: null,
        terminalId: scene.terminal.id,
        accessPointId: scene.accessPoint.id,
        usuarioId: scene.user.id,
        authorizationId: scene.authorization!.id,
        detalhes: { precisaoMetros: 12.5 },
      });
      const open = await commands();
      expect(open).toHaveLength(1);
      expect(open[0]).toMatchObject({
        terminalId: scene.terminal.id,
        tipo: 'ABRIR',
        aberturaMs: 5000,
        motivo: null,
      });
      expect(open[0]!.expiraEm.getTime() - open[0]!.criadoEm.getTime()).toBe(10_000);
    });

    it.each(['ADMIN', 'CONDOMINO', 'VISITANTE'] as const)('aceita o perfil %s', async (perfil) => {
      const scene = await seedScene({ user: { perfil } });

      expect((await validate(scene)).status).toBe(200);
    });

    it('o terminal recebe o ABRIR na consulta de comandos logo depois', async () => {
      const scene = await seedScene();
      await validate(scene);

      const res = await request(app)
        .get('/api/v1/terminal/commands')
        .set({ 'X-Terminal-Id': scene.terminal.id, 'X-Terminal-Key': TERMINAL_KEY });

      expect(res.status).toBe(200);
      expect(res.body.commands).toEqual([
        {
          id: expect.any(Number),
          tipo: 'ABRIR',
          aberturaMs: 5000,
          criadoEm: expect.stringMatching(/Z$/),
        },
      ]);
    });
  });

  describe('casos 2 a 12: negações', () => {
    interface Case {
      reason: QrDenialReason;
      name: string;
      /** Builds the scene and the extra fields of the body. */
      arrange: () => Promise<{ scene: Scene; body?: Record<string, unknown> }>;
      /** The terminal is told only when the credential identifies it. */
      commandForTerminal: boolean;
      /** Credentials start unused; the reused one starts consumed. */
      startsConsumed?: boolean;
    }

    const cases: Case[] = [
      {
        reason: 'CREDENCIAL_INVALIDA',
        name: 'QR adulterado (token que não existe)',
        arrange: async () => ({
          scene: await seedScene(),
          body: { payload: `ACS1:${newToken()}` },
        }),
        commandForTerminal: false,
      },
      {
        reason: 'CREDENCIAL_INVALIDA',
        name: 'terminal inativo',
        arrange: async () => ({ scene: await seedScene({ terminal: { ativo: false } }) }),
        commandForTerminal: true,
      },
      {
        reason: 'CREDENCIAL_EXPIRADA',
        name: 'QR expirado',
        arrange: async () => ({
          scene: await seedScene({
            credential: {
              emitidoEm: new Date(Date.now() - 30_000),
              expiraEm: new Date(Date.now() - 15_000),
            },
          }),
        }),
        commandForTerminal: true,
      },
      {
        reason: 'CREDENCIAL_REUTILIZADA',
        name: 'QR já usado',
        arrange: async () => {
          const other = await insertUser();
          return {
            scene: await seedScene({
              credential: { consumidoEm: new Date(Date.now() - 1000), consumidoPorId: other.id },
            }),
          };
        },
        commandForTerminal: true,
        startsConsumed: true,
      },
      {
        reason: 'USUARIO_INATIVO',
        name: 'usuário inativo com token válido',
        arrange: async () => ({ scene: await seedScene({ user: { ativo: false } }) }),
        commandForTerminal: true,
      },
      {
        reason: 'SEM_AUTORIZACAO',
        name: 'autorização de outro local',
        arrange: async () => {
          const otherPoint = await insertAccessPoint();
          return { scene: await seedScene({ authorization: { accessPointId: otherPoint.id } }) };
        },
        commandForTerminal: true,
      },
      {
        reason: 'AUTORIZACAO_CANCELADA',
        name: 'autorização cancelada',
        arrange: async () => ({
          scene: await seedScene({ authorization: { situacao: 'CANCELADA' } }),
        }),
        commandForTerminal: true,
      },
      {
        reason: 'FORA_DO_PERIODO',
        name: 'depois do fim do período',
        arrange: async () => ({
          scene: await seedScene({ authorization: { dataInicio: day(-10), dataFim: day(-1) } }),
        }),
        commandForTerminal: true,
      },
      {
        reason: 'FORA_DO_PERIODO',
        name: 'antes do início do período',
        arrange: async () => ({
          scene: await seedScene({ authorization: { dataInicio: day(1), dataFim: day(10) } }),
        }),
        commandForTerminal: true,
      },
      {
        reason: 'FORA_DO_PERIODO',
        name: 'dentro do período, fora do horário',
        arrange: async () => ({ scene: await seedScene({ authorization: hoursAwayFromNow() }) }),
        commandForTerminal: true,
      },
      {
        reason: 'USOS_ESGOTADOS',
        name: 'usos esgotados',
        arrange: async () => ({
          scene: await seedScene({ authorization: { usosPermitidos: 2, usosRealizados: 2 } }),
        }),
        commandForTerminal: true,
      },
      {
        reason: 'DISTANTE_DO_TERMINAL',
        name: '101 m do terminal',
        // About 101 m east of the registered position.
        arrange: async () => ({ scene: await seedScene(), body: { longitude: -45.96452099 } }),
        commandForTerminal: true,
      },
      {
        reason: 'LOCALIZACAO_INVALIDA',
        name: 'coordenadas ausentes',
        arrange: async () => ({
          scene: await seedScene(),
          body: { latitude: undefined, longitude: undefined },
        }),
        commandForTerminal: true,
      },
    ];

    it('cobre os dez motivos do contrato', () => {
      expect([...new Set(cases.map((c) => c.reason))].sort()).toEqual(
        [...QR_DENIAL_REASONS].sort(),
      );
    });

    it.each(cases)(
      '403 $reason: $name, com um evento NEGADO e sem consumir nada',
      async ({ reason, arrange, commandForTerminal, startsConsumed = false }) => {
        const { scene, body } = await arrange();

        const res = await validate(scene, body);

        expect(res.status).toBe(403);
        expect(res.body).toEqual({ error: { code: reason, message: QR_DENIAL_MESSAGES[reason] } });
        const stored = await events();
        expect(stored).toHaveLength(1);
        expect(stored[0]).toMatchObject({
          metodo: 'QR',
          resultado: 'NEGADO',
          motivo: reason,
          usuarioId: scene.user.id,
        });
        const sent = await commands();
        if (commandForTerminal) {
          expect(sent).toHaveLength(1);
          expect(sent[0]).toMatchObject({
            terminalId: scene.terminal.id,
            tipo: 'NEGAR',
            motivo: reason,
            aberturaMs: null,
          });
          expect(sent[0]!.expiraEm.getTime() - sent[0]!.criadoEm.getTime()).toBe(10_000);
        } else {
          expect(sent).toHaveLength(0);
        }
        expect(await isConsumed(scene)).toBe(startsConsumed);
        if (scene.authorization) {
          const before = scene.authorization.usosRealizados;
          expect(await usesOf(scene)).toBe(before);
        }
      },
    );

    it('o evento de uma credencial desconhecida não tem terminal nem ponto e só guarda o prefixo do hash', async () => {
      const scene = await seedScene();
      const unknown = newToken();

      await validate(scene, { payload: `ACS1:${unknown}`, precisaoMetros: 8 });

      const [event] = await events();
      expect(event).toMatchObject({
        terminalId: null,
        accessPointId: null,
        authorizationId: null,
        usuarioId: scene.user.id,
        distanciaM: null,
      });
      expect(event?.detalhes).toEqual({
        credencialHashPrefixo: sha256(unknown).slice(0, 8),
        precisaoMetros: 8,
      });
      expect(JSON.stringify(event)).not.toContain(unknown);
      expect(JSON.stringify(event)).not.toContain(sha256(unknown));
    });

    it('o evento de DISTANTE_DO_TERMINAL guarda a distância e a autorização', async () => {
      const scene = await seedScene();

      await validate(scene, { longitude: -45.96452099 });

      const [event] = await events();
      expect(event?.authorizationId).toBe(scene.authorization!.id);
      expect(event?.distanciaM).toBeGreaterThan(100);
      expect(event?.distanciaM).toBeLessThan(102);
    });

    it('o terminal recebe o NEGAR com o motivo na consulta de comandos', async () => {
      const scene = await seedScene({ authorization: null });
      await validate(scene);

      const res = await request(app)
        .get('/api/v1/terminal/commands')
        .set({ 'X-Terminal-Id': scene.terminal.id, 'X-Terminal-Key': TERMINAL_KEY });

      expect(res.body.commands).toEqual([
        {
          id: expect.any(Number),
          tipo: 'NEGAR',
          motivo: 'SEM_AUTORIZACAO',
          criadoEm: expect.stringMatching(/Z$/),
        },
      ]);
    });

    it('nunca devolve o token nem o hash na resposta', async () => {
      const scene = await seedScene({ authorization: null });

      const res = await validate(scene);

      expect(JSON.stringify(res.body)).not.toContain(scene.token);
      expect(JSON.stringify(res.body)).not.toContain(sha256(scene.token));
    });
  });

  describe('caso 14: autenticação', () => {
    it('401 sem token, sem gerar evento nem comando', async () => {
      const scene = await seedScene();

      const res = await request(app)
        .post(URL)
        .send({ payload: scene.payload, ...here });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(await events()).toHaveLength(0);
      expect(await commands()).toHaveLength(0);
      expect(await isConsumed(scene)).toBe(false);
    });

    it('401 com token inválido ou expirado, sem gerar evento', async () => {
      const scene = await seedScene();

      const invalid = await request(app)
        .post(URL)
        .set('Authorization', 'Bearer isso-nao-e-um-jwt')
        .send({ payload: scene.payload, ...here });
      const expired = await request(app)
        .post(URL)
        .set('Authorization', `Bearer ${expiredTokenFor(scene.user)}`)
        .send({ payload: scene.payload, ...here });

      expect(invalid.status).toBe(401);
      expect(expired.status).toBe(401);
      expect(await events()).toHaveLength(0);
    });

    it('401 quando a conta do token foi apagada do cadastro (sem evento)', async () => {
      const scene = await seedScene();
      const ghostToken = bearer({
        id: '00000000-0000-4000-8000-00000000dead',
        perfil: 'VISITANTE',
      });

      const res = await request(app)
        .post(URL)
        .set('Authorization', ghostToken)
        .send({ payload: scene.payload, ...here });

      expect(res.status).toBe(401);
      expect(await events()).toHaveLength(0);
    });
  });

  describe('validação do corpo (422, sem evento)', () => {
    it.each([
      ['sem payload', { payload: undefined }],
      ['payload que não é texto', { payload: 123 }],
      ['prefixo errado', { payload: 'ACS2:q3F8k2Zr1pLw9XbTn0YhVA' }],
      ['token curto (21 caracteres)', { payload: 'ACS1:q3F8k2Zr1pLw9XbTn0YhV' }],
      ['token longo (23 caracteres)', { payload: 'ACS1:q3F8k2Zr1pLw9XbTn0YhVAA' }],
      ['caractere fora do base64url', { payload: 'ACS1:q3F8k2Zr1pLw9XbTn0Yh+A' }],
      ['texto solto', { payload: 'https://exemplo.com/qr' }],
    ])('422 no campo payload: %s', async (_name, body) => {
      const scene = await seedScene();

      const res = await validate(scene, body);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual([expect.objectContaining({ field: 'payload' })]);
      expect(await events()).toHaveLength(0);
      expect(await isConsumed(scene)).toBe(false);
    });

    it.each([
      ['latitude acima de 90', { latitude: 90.0001 }, 'latitude'],
      ['latitude abaixo de -90', { latitude: -91 }, 'latitude'],
      ['longitude acima de 180', { longitude: 180.5 }, 'longitude'],
      ['longitude abaixo de -180', { longitude: -181 }, 'longitude'],
      ['latitude em texto', { latitude: '-23.3' }, 'latitude'],
      ['precisão negativa', { precisaoMetros: -1 }, 'precisaoMetros'],
      ['precisão em texto', { precisaoMetros: 'alta' }, 'precisaoMetros'],
    ])('422: %s', async (_name, body, field) => {
      const scene = await seedScene();

      const res = await validate(scene, body);

      expect(res.status).toBe(422);
      expect(res.body.error.details).toEqual([expect.objectContaining({ field })]);
      expect(await events()).toHaveLength(0);
    });

    it('aceita as pontas das faixas de coordenadas (dão distância, não erro de formato)', async () => {
      const scene = await seedScene();

      const res = await validate(scene, { latitude: 90, longitude: -180 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('DISTANTE_DO_TERMINAL');
    });

    it('422 com JSON malformado', async () => {
      const scene = await seedScene();

      const res = await request(app)
        .post(URL)
        .set('Authorization', bearer(scene.user))
        .set('Content-Type', 'application/json')
        .send('{"payload": ');

      expect(res.status).toBe(422);
    });
  });

  describe('limite de validações por minuto', () => {
    const limit = container.env.QR_VALIDATE_MAX_PER_MINUTE;

    it('a validação seguinte ao limite recebe 429 RATE_LIMITED, e o limite é por usuário', async () => {
      const scene = await seedScene();
      // Malformed bodies are cheap and still count: the limiter runs before the validation.
      for (let i = 0; i < limit; i += 1) {
        expect((await validate(scene, { payload: 'x' })).status).toBe(422);
      }

      const blocked = await validate(scene);

      expect(blocked.status).toBe(429);
      expect(blocked.body.error.code).toBe('RATE_LIMITED');
      expect(await events()).toHaveLength(0);

      const other = await seedScene();
      expect((await validate(other)).status).toBe(200);
    });

    it('requisições sem login recebem 401 e não gastam o limite de ninguém', async () => {
      for (let i = 0; i < limit + 3; i += 1) {
        expect((await request(app).post(URL).send({ payload: 'x' })).status).toBe(401);
      }
    });
  });

  describe('caso 13 e concorrência', () => {
    it('duas leituras simultâneas do mesmo QR: uma aprovada e a outra CREDENCIAL_REUTILIZADA', async () => {
      const scene = await seedScene();

      const [a, b] = await Promise.all([validate(scene), validate(scene)]);

      expect([a.status, b.status].sort()).toEqual([200, 403]);
      const denied = a.status === 403 ? a : b;
      expect(denied.body.error.code).toBe('CREDENCIAL_REUTILIZADA');
      expect(await usesOf(scene)).toBe(1);
      const stored = await events();
      expect(stored.map((e) => e.resultado).sort()).toEqual(['AUTORIZADO', 'NEGADO']);
      expect((await commands()).map((c) => c.tipo).sort()).toEqual(['ABRIR', 'NEGAR']);
    });

    it('oito leituras simultâneas do mesmo QR: só uma aprovada, um uso consumido, oito eventos', async () => {
      const scene = await seedScene();

      const results = await Promise.all(Array.from({ length: 8 }, () => validate(scene)));

      expect(results.filter((r) => r.status === 200)).toHaveLength(1);
      expect(results.filter((r) => r.status === 403).map((r) => r.body.error.code)).toEqual(
        Array.from({ length: 7 }, () => 'CREDENCIAL_REUTILIZADA'),
      );
      expect(await usesOf(scene)).toBe(1);
      expect(await events()).toHaveLength(8);
    });

    it('dois QRs diferentes com um uso restante: uma aprovada e a outra USOS_ESGOTADOS', async () => {
      const first = await seedScene({ authorization: { usosPermitidos: 1 } });
      const token = newToken();
      const now = Date.now();
      const second = await insertQrCredential({
        terminalId: first.terminal.id,
        tokenHash: sha256(token),
        emitidoEm: new Date(now - 2000),
        expiraEm: new Date(now + 13_000),
      });

      const [a, b] = await Promise.all([
        validate(first),
        validate(first, { payload: `ACS1:${token}` }),
      ]);

      expect([a.status, b.status].sort()).toEqual([200, 403]);
      const denied = a.status === 403 ? a : b;
      expect(denied.body.error.code).toBe('USOS_ESGOTADOS');
      expect(await usesOf(first)).toBe(1);
      // The credential of the denied request is still free.
      const consumed = await prisma.qrCredential.count({ where: { consumidoEm: { not: null } } });
      expect(consumed).toBe(1);
      expect(
        [first.credential.id, second.id].includes(
          (await prisma.qrCredential.findFirstOrThrow({ where: { consumidoEm: null } })).id,
        ),
      ).toBe(true);
      expect((await events()).map((e) => e.resultado).sort()).toEqual(['AUTORIZADO', 'NEGADO']);
    });
  });

  describe('falha de gravação do evento', () => {
    it('na aprovação: 500, uso e credencial intactos e nenhum comando ABRIR', async () => {
      const scene = await seedScene();
      await failEventInserts('AUTORIZADO');

      const res = await request(productionApp)
        .post(URL)
        .set('Authorization', bearer(scene.user))
        .send({ payload: scene.payload, ...here });

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');
      expect(JSON.stringify(res.body)).not.toContain('falha injetada');
      expect(res.body.error.stack).toBeUndefined();
      expect(await usesOf(scene)).toBe(0);
      expect(await isConsumed(scene)).toBe(false);
      expect(await commands()).toHaveLength(0);
      expect(await events()).toHaveLength(0);
    });

    it('na negação: a resposta continua sendo a negação certa e o terminal ainda recebe o NEGAR', async () => {
      const scene = await seedScene({ authorization: null });
      await failEventInserts('NEGADO');

      const res = await validate(scene);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('SEM_AUTORIZACAO');
      expect(await events()).toHaveLength(0);
      const sent = await commands();
      expect(sent).toHaveLength(1);
      expect(sent[0]).toMatchObject({ tipo: 'NEGAR', motivo: 'SEM_AUTORIZACAO' });
    });
  });

  describe('desempenho', () => {
    it('responde em menos de 500 ms no ambiente local', async () => {
      // The first request pays for connections and compiled queries; the target is for the ones after.
      await validate(await seedScene());
      const scene = await seedScene();

      const started = performance.now();
      const res = await validate(scene);
      const elapsed = performance.now() - started;

      process.stdout.write(`\n[B15] POST /access/qr/validate: ${elapsed.toFixed(0)} ms\n`);
      expect(res.status).toBe(200);
      expect(elapsed).toBeLessThan(500);
    });
  });
});
