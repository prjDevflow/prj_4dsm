import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { FakeHashProvider } from '../../../../test/doubles/FakeHashProvider';
import { InMemoryAccessEventRepository } from '../../../../test/doubles/InMemoryAccessEventRepository';
import { InMemoryAccessGrantRepository } from '../../../../test/doubles/InMemoryAccessGrantRepository';
import { makeLocationDoubles } from '../../../../test/doubles/InMemoryLocationUnitOfWork';
import { InMemoryQrCredentialRepository } from '../../../../test/doubles/InMemoryQrCredentialRepository';
import { InMemoryTerminalCommandRepository } from '../../../../test/doubles/InMemoryTerminalCommandRepository';
import { InMemoryTerminalRepository } from '../../../../test/doubles/InMemoryTerminalRepository';
import { SequentialIdGenerator } from '../../../../test/doubles/SequentialIdGenerator';
import { SpyLogger } from '../../../../test/doubles/SpyLogger';
import { makeAccessPoint } from '../../../../test/factories/makeAccessPoint';
import { makeAuthorization } from '../../../../test/factories/makeAuthorization';
import { makeQrCredential } from '../../../../test/factories/makeQrCredential';
import { makeTerminal } from '../../../../test/factories/makeTerminal';
import { makeUser } from '../../../../test/factories/makeUser';
import { QR_DENIAL_REASONS, type QrDenialReason } from '../../../entities/DenialReason';
import { haversineDistanceM } from '../../../entities/rules/haversineDistanceM';
import { UnauthorizedError } from '../../../shared/errors/AppError';
import { AccessEventRecorder } from '../../Events/AccessEventRecorder';
import {
  ValidateQrAccessUseCase,
  type ValidateQrAccessConfig,
  type ValidateQrAccessInput,
} from './ValidateQrAccess_UseCase';

const TOKEN = 'q3F8k2Zr1pLw9XbTn0YhVA';
const PAYLOAD = `ACS1:${TOKEN}`;
const USER_ID = '00000000-0000-4000-8000-0000000000e1';
const TERMINAL_ID = '00000000-0000-4000-8000-0000000000a9';
const POINT_ID = '00000000-0000-4000-8000-0000000000c1';
const AUTHORIZATION_ID = '00000000-0000-4000-8000-0000000000a1';
/** The QR was issued at T0 and is valid for 15 s. */
const T0 = new Date('2026-10-20T14:00:00Z');

/** The fake hash keeps the text inside it; a real digest is what shows a token is not stored. */
class HexHashProvider extends FakeHashProvider {
  override sha256(text: string) {
    return createHash('sha256').update(text).digest('hex');
  }
}

const defaultConfig: ValidateQrAccessConfig = {
  maxDistanceM: 100,
  positionSource: 'GPS_COM_FALLBACK',
  gpsMaxAgeMinutes: 10,
  commandTtlSeconds: 10,
  aberturaMs: 5000,
};

/** Phone exactly where the access point is registered. */
const atTheTerminal = { latitude: -23.30512, longitude: -45.96551 };
/** 99 m north and 101 m east of the registered position. */
const north99m = { latitude: -23.30422967, longitude: -45.96551 };
const east101m = { latitude: -23.30512, longitude: -45.96452099 };
/** About 5 km north of the registered position: where a terminal with a GPS fix may report itself. */
const gpsSpot = { latitude: -23.26012, longitude: -45.96551 };

const makeSut = (config: Partial<ValidateQrAccessConfig> = {}) => {
  const { accessPoints, authorizations, users } = makeLocationDoubles();
  const credentials = new InMemoryQrCredentialRepository();
  const terminals = new InMemoryTerminalRepository();
  const events = new InMemoryAccessEventRepository();
  const commands = new InMemoryTerminalCommandRepository();
  const accessGrants = new InMemoryAccessGrantRepository(
    credentials,
    authorizations,
    events,
    commands,
  );
  const hash = new HexHashProvider();
  const ids = new SequentialIdGenerator();
  // The QR is read 3 s after it was issued.
  const clock = new FakeClock(new Date(T0.getTime() + 3000));
  const logger = new SpyLogger();
  const recorder = new AccessEventRecorder(events, ids, clock, logger);
  const sut = new ValidateQrAccessUseCase(
    credentials,
    terminals,
    accessPoints,
    users,
    authorizations,
    accessGrants,
    commands,
    recorder,
    hash,
    ids,
    clock,
    logger,
    { ...defaultConfig, ...config },
  );

  /** The default scene: everything is valid and the phone is at the terminal. */
  const seed = async () => {
    await users.save(makeUser({ id: USER_ID }));
    await accessPoints.save(makeAccessPoint({ id: POINT_ID }));
    await terminals.save(makeTerminal({ id: TERMINAL_ID, accessPointId: POINT_ID }));
    credentials.seed(makeQrCredential({ terminalId: TERMINAL_ID, tokenHash: hash.sha256(TOKEN) }));
    authorizations.add(
      makeAuthorization({
        id: AUTHORIZATION_ID,
        usuarioId: USER_ID,
        accessPointId: POINT_ID,
        dataInicio: '2026-10-01',
        dataFim: '2026-10-31',
        usosPermitidos: 3,
      }),
    );
  };

  const validate = (overrides: Partial<ValidateQrAccessInput> = {}) =>
    sut.execute({ userId: USER_ID, payload: PAYLOAD, ...atTheTerminal, ...overrides });

  return {
    sut,
    validate,
    seed,
    clock,
    logger,
    hash,
    accessGrants,
    users,
    terminals,
    accessPoints,
    credentials,
    authorizations,
    events,
    commands,
  };
};

/** The state a denial must leave untouched. */
const expectNothingConsumed = (world: ReturnType<typeof makeSut>) => {
  expect(world.credentials.all().every((c) => c.consumidoEm === null)).toBe(true);
  expect(world.authorizations.all().every((a) => a.usosRealizados === 0)).toBe(true);
};

describe('ValidateQrAccess', () => {
  describe('caminho feliz', () => {
    it('deve autorizar e devolver a autorização, os usos restantes, a distância, o local e o instante', async () => {
      const world = makeSut();
      await world.seed();

      const decision = await world.validate();

      expect(decision).toEqual({
        granted: true,
        authorizationId: AUTHORIZATION_ID,
        usosRestantes: 2,
        distanceM: 0,
        local: { nome: 'Catraca Social' },
        ocorridoEm: new Date(T0.getTime() + 3000),
      });
    });

    it('deve chamar commitApproval uma vez, com a credencial, o usuário e a autorização', async () => {
      const world = makeSut();
      await world.seed();
      const commit = vi.spyOn(world.accessGrants, 'commitApproval');

      await world.validate();

      expect(commit).toHaveBeenCalledTimes(1);
      expect(commit.mock.calls[0]?.[0]).toMatchObject({
        credentialId: makeQrCredential().id,
        userId: USER_ID,
        authorizationId: AUTHORIZATION_ID,
        now: new Date(T0.getTime() + 3000),
      });
    });

    it('deve consumir a credencial e um uso, gravar um evento AUTORIZADO e criar o comando ABRIR', async () => {
      const world = makeSut();
      await world.seed();

      await world.validate({ precisaoMetros: 12.5 });

      expect(world.credentials.all()[0]).toMatchObject({
        consumidoEm: new Date(T0.getTime() + 3000),
        consumidoPorId: USER_ID,
      });
      expect(world.authorizations.all()[0]?.usosRealizados).toBe(1);
      expect(world.events.all()).toHaveLength(1);
      expect(world.events.all()[0]).toMatchObject({
        resultado: 'AUTORIZADO',
        motivo: null,
        metodo: 'QR',
        terminalId: TERMINAL_ID,
        accessPointId: POINT_ID,
        usuarioId: USER_ID,
        authorizationId: AUTHORIZATION_ID,
        distanciaM: 0,
        detalhes: { precisaoMetros: 12.5 },
      });
      expect(world.commands.all()).toHaveLength(1);
      expect(world.commands.all()[0]).toMatchObject({
        terminalId: TERMINAL_ID,
        tipo: 'ABRIR',
        aberturaMs: 5000,
        motivo: null,
        criadoEm: new Date(T0.getTime() + 3000),
        expiraEm: new Date(T0.getTime() + 13_000),
      });
    });
  });

  describe('verificações da credencial (1 a 4)', () => {
    it('deve negar com CREDENCIAL_INVALIDA quando o token não existe', async () => {
      const world = makeSut();
      await world.seed();

      const decision = await world.validate({ payload: 'ACS1:aaaaaaaaaaaaaaaaaaaaaa' });

      expect(decision).toEqual({ granted: false, reason: 'CREDENCIAL_INVALIDA' });
    });

    it('deve gravar o evento da credencial desconhecida sem terminal nem ponto, só com o prefixo do hash e sem comando', async () => {
      const world = makeSut();
      await world.seed();
      const unknownToken = 'aaaaaaaaaaaaaaaaaaaaaa';

      await world.validate({ payload: `ACS1:${unknownToken}` });

      const [event] = world.events.all();
      expect(world.events.all()).toHaveLength(1);
      expect(event).toMatchObject({
        resultado: 'NEGADO',
        motivo: 'CREDENCIAL_INVALIDA',
        metodo: 'QR',
        terminalId: null,
        accessPointId: null,
        usuarioId: USER_ID,
        authorizationId: null,
        distanciaM: null,
      });
      const fullHash = world.hash.sha256(unknownToken);
      expect(event?.detalhes).toEqual({ credencialHashPrefixo: fullHash.slice(0, 8) });
      expect(JSON.stringify(event)).not.toContain(unknownToken);
      expect(JSON.stringify(event)).not.toContain(fullHash);
      expect(world.commands.all()).toHaveLength(0);
      expectNothingConsumed(world);
    });

    it('deve negar com CREDENCIAL_REUTILIZADA quando a credencial já foi consumida', async () => {
      const world = makeSut();
      await world.seed();
      world.credentials.seed(
        makeQrCredential({
          terminalId: TERMINAL_ID,
          tokenHash: world.hash.sha256(TOKEN),
          consumidoEm: new Date(T0.getTime() + 1000),
          consumidoPorId: 'outra-pessoa',
        }),
      );

      const decision = await world.validate();

      expect(decision).toEqual({ granted: false, reason: 'CREDENCIAL_REUTILIZADA' });
      expect(world.credentials.all()[0]?.consumidoPorId).toBe('outra-pessoa');
      expect(world.authorizations.all()[0]?.usosRealizados).toBe(0);
    });

    it('deve negar com CREDENCIAL_EXPIRADA depois dos 15 s e aceitar exatamente em 15 s', async () => {
      const world = makeSut();
      await world.seed();
      world.clock.set(new Date(T0.getTime() + 15_000));
      expect((await world.validate()).granted).toBe(true);

      const late = makeSut();
      await late.seed();
      late.clock.set(new Date(T0.getTime() + 15_001));
      expect(await late.validate()).toEqual({ granted: false, reason: 'CREDENCIAL_EXPIRADA' });

      const later = makeSut();
      await later.seed();
      later.clock.set(new Date(T0.getTime() + 16_000));
      expect(await later.validate()).toEqual({ granted: false, reason: 'CREDENCIAL_EXPIRADA' });
    });

    it('deve negar com CREDENCIAL_INVALIDA quando o terminal está inativo', async () => {
      const world = makeSut();
      await world.seed();
      await world.terminals.updateDetails(TERMINAL_ID, { ativo: false });

      expect(await world.validate()).toEqual({ granted: false, reason: 'CREDENCIAL_INVALIDA' });
    });

    it('deve negar com CREDENCIAL_INVALIDA quando o ponto de acesso está inativo', async () => {
      const world = makeSut();
      await world.seed();
      await world.accessPoints.save(makeAccessPoint({ id: POINT_ID, ativo: false }));

      expect(await world.validate()).toEqual({ granted: false, reason: 'CREDENCIAL_INVALIDA' });
    });

    it('deve seguir a ordem da tabela: reutilizada antes de expirada, e expirada antes de terminal inativo e de usuário inativo', async () => {
      const reusedAndExpired = makeSut();
      await reusedAndExpired.seed();
      reusedAndExpired.credentials.seed(
        makeQrCredential({
          terminalId: TERMINAL_ID,
          tokenHash: reusedAndExpired.hash.sha256(TOKEN),
          consumidoEm: T0,
        }),
      );
      reusedAndExpired.clock.set(new Date(T0.getTime() + 60_000));
      expect((await reusedAndExpired.validate()).granted).toBe(false);
      expect(reusedAndExpired.events.all()[0]?.motivo).toBe('CREDENCIAL_REUTILIZADA');

      const expiredAndInactive = makeSut();
      await expiredAndInactive.seed();
      await expiredAndInactive.terminals.updateDetails(TERMINAL_ID, { ativo: false });
      await expiredAndInactive.users.save(makeUser({ id: USER_ID, ativo: false }));
      expiredAndInactive.clock.set(new Date(T0.getTime() + 60_000));
      expect(await expiredAndInactive.validate()).toEqual({
        granted: false,
        reason: 'CREDENCIAL_EXPIRADA',
      });
    });
  });

  describe('verificação 5: usuário ativo', () => {
    it('deve negar com USUARIO_INATIVO e registrar o evento com o usuário', async () => {
      const world = makeSut();
      await world.seed();
      await world.users.save(makeUser({ id: USER_ID, ativo: false }));

      const decision = await world.validate();

      expect(decision).toEqual({ granted: false, reason: 'USUARIO_INATIVO' });
      expect(world.events.all()).toHaveLength(1);
      expect(world.events.all()[0]).toMatchObject({
        resultado: 'NEGADO',
        motivo: 'USUARIO_INATIVO',
        usuarioId: USER_ID,
        terminalId: TERMINAL_ID,
        accessPointId: POINT_ID,
        authorizationId: null,
      });
      expect(world.commands.all()[0]).toMatchObject({ tipo: 'NEGAR', motivo: 'USUARIO_INATIVO' });
      expectNothingConsumed(world);
    });

    it('deve negar com USUARIO_INATIVO antes de olhar as autorizações', async () => {
      const world = makeSut();
      await world.seed();
      await world.users.save(makeUser({ id: USER_ID, ativo: false }));
      world.authorizations.clear();

      expect(await world.validate()).toEqual({ granted: false, reason: 'USUARIO_INATIVO' });
    });

    it('deve rejeitar com 401 quando o usuário do token já não existe', async () => {
      const world = makeSut();
      await world.seed();

      await expect(world.validate({ userId: 'nao-existe' })).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
      expect(world.events.all()).toHaveLength(0);
    });
  });

  describe('verificações 6 a 9: autorização', () => {
    /** Replaces the default authorization with `overrides` applied to it. */
    const authorizeWith = (
      world: ReturnType<typeof makeSut>,
      ...list: Parameters<typeof makeAuthorization>[0][]
    ) => {
      world.authorizations.clear();
      list.forEach((overrides, index) =>
        world.authorizations.add(
          makeAuthorization({
            id: `00000000-0000-4000-8000-0000000000a${index + 1}`,
            usuarioId: USER_ID,
            accessPointId: POINT_ID,
            dataInicio: '2026-10-01',
            dataFim: '2026-10-31',
            ...overrides,
          }),
        ),
      );
    };

    it('deve negar com SEM_AUTORIZACAO quando o usuário não tem autorização', async () => {
      const world = makeSut();
      await world.seed();
      authorizeWith(world);

      expect(await world.validate()).toEqual({ granted: false, reason: 'SEM_AUTORIZACAO' });
      expect(world.events.all()[0]).toMatchObject({
        motivo: 'SEM_AUTORIZACAO',
        authorizationId: null,
      });
    });

    it('deve negar com SEM_AUTORIZACAO quando a autorização é de outro local', async () => {
      const world = makeSut();
      await world.seed();
      authorizeWith(world, { accessPointId: '00000000-0000-4000-8000-0000000000c2' });

      expect(await world.validate()).toEqual({ granted: false, reason: 'SEM_AUTORIZACAO' });
    });

    it('deve negar com AUTORIZACAO_CANCELADA quando só há canceladas', async () => {
      const world = makeSut();
      await world.seed();
      authorizeWith(world, { situacao: 'CANCELADA' });

      expect(await world.validate()).toEqual({ granted: false, reason: 'AUTORIZACAO_CANCELADA' });
    });

    it('deve negar com FORA_DO_PERIODO antes do início e depois do fim, e aceitar no último dia', async () => {
      const before = makeSut();
      await before.seed();
      authorizeWith(before, { dataInicio: '2026-10-21', dataFim: '2026-10-30' });
      expect(await before.validate()).toEqual({ granted: false, reason: 'FORA_DO_PERIODO' });

      const after = makeSut();
      await after.seed();
      authorizeWith(after, { dataInicio: '2026-10-01', dataFim: '2026-10-19' });
      expect(await after.validate()).toEqual({ granted: false, reason: 'FORA_DO_PERIODO' });

      const lastDay = makeSut();
      await lastDay.seed();
      authorizeWith(lastDay, { dataInicio: '2026-10-01', dataFim: '2026-10-20' });
      expect((await lastDay.validate()).granted).toBe(true);
    });

    it('deve negar com FORA_DO_PERIODO um minuto fora do horário e aceitar nos limites (agora são 11:00 em São Paulo)', async () => {
      const early = makeSut();
      await early.seed();
      authorizeWith(early, { horaInicio: '11:01', horaFim: '18:00' });
      expect(await early.validate()).toEqual({ granted: false, reason: 'FORA_DO_PERIODO' });

      const late = makeSut();
      await late.seed();
      authorizeWith(late, { horaInicio: '08:00', horaFim: '10:59' });
      expect(await late.validate()).toEqual({ granted: false, reason: 'FORA_DO_PERIODO' });

      const exactStart = makeSut();
      await exactStart.seed();
      authorizeWith(exactStart, { horaInicio: '11:00', horaFim: '18:00' });
      expect((await exactStart.validate()).granted).toBe(true);

      const exactEnd = makeSut();
      await exactEnd.seed();
      authorizeWith(exactEnd, { horaInicio: '08:00', horaFim: '11:00' });
      expect((await exactEnd.validate()).granted).toBe(true);
    });

    it('deve negar com USOS_ESGOTADOS quando a autorização vigente não tem mais usos', async () => {
      const world = makeSut();
      await world.seed();
      authorizeWith(world, { usosPermitidos: 2, usosRealizados: 2 });

      expect(await world.validate()).toEqual({ granted: false, reason: 'USOS_ESGOTADOS' });
      expect(world.events.all()[0]).toMatchObject({
        motivo: 'USOS_ESGOTADOS',
        authorizationId: null,
      });
      expect(world.credentials.all()[0]?.consumidoEm).toBeNull();
    });

    it('deve usar a autorização de dataFim mais próxima entre as elegíveis e deixar a outra intacta', async () => {
      const world = makeSut();
      await world.seed();
      authorizeWith(
        world,
        { dataFim: '2026-10-31' },
        { dataFim: '2026-10-22' },
        { dataFim: '2026-10-25' },
      );

      const decision = await world.validate();

      expect(decision.granted && decision.authorizationId).toBe(
        '00000000-0000-4000-8000-0000000000a2',
      );
      const used = world.authorizations.all().map((a) => [a.id.slice(-2), a.usosRealizados]);
      expect(used).toEqual([
        ['a1', 0],
        ['a2', 1],
        ['a3', 0],
      ]);
      expect(world.events.all()[0]?.authorizationId).toBe('00000000-0000-4000-8000-0000000000a2');
    });
  });

  describe('verificação 10: localização do celular', () => {
    it.each([
      ['sem latitude', { latitude: undefined }],
      ['sem longitude', { longitude: undefined }],
      ['com latitude nula', { latitude: null }],
      ['com longitude nula', { longitude: null }],
      ['sem nenhuma das duas', { latitude: undefined, longitude: undefined }],
      ['com latitude fora da faixa', { latitude: 91 }],
      ['com longitude fora da faixa', { longitude: -181 }],
      ['com latitude que não é número finito', { latitude: Number.NaN }],
      ['com longitude infinita', { longitude: Number.POSITIVE_INFINITY }],
    ])('deve negar com LOCALIZACAO_INVALIDA quando o celular vem %s', async (_name, location) => {
      const world = makeSut();
      await world.seed();

      const decision = await world.validate(location);

      expect(decision).toEqual({ granted: false, reason: 'LOCALIZACAO_INVALIDA' });
      expect(world.events.all()[0]).toMatchObject({
        motivo: 'LOCALIZACAO_INVALIDA',
        authorizationId: AUTHORIZATION_ID,
        distanciaM: null,
      });
      expect(world.commands.all()[0]).toMatchObject({
        tipo: 'NEGAR',
        motivo: 'LOCALIZACAO_INVALIDA',
      });
      expectNothingConsumed(world);
    });

    it('deve checar a localização depois da autorização: sem autorização e sem coordenadas dá SEM_AUTORIZACAO', async () => {
      const world = makeSut();
      await world.seed();
      world.authorizations.clear();

      expect(await world.validate({ latitude: undefined })).toEqual({
        granted: false,
        reason: 'SEM_AUTORIZACAO',
      });
    });
  });

  describe('verificação 11: distância até o terminal', () => {
    it('deve autorizar a 99 m e devolver a distância medida', async () => {
      const world = makeSut();
      await world.seed();

      const decision = await world.validate(north99m);

      expect(decision.granted && decision.distanceM).toBeCloseTo(99, 0);
      expect(world.events.all()[0]?.distanciaM).toBeCloseTo(99, 0);
    });

    it('deve negar com DISTANTE_DO_TERMINAL a 101 m, gravando a distância e a autorização no evento', async () => {
      const world = makeSut();
      await world.seed();

      const decision = await world.validate(east101m);

      expect(decision).toEqual({ granted: false, reason: 'DISTANTE_DO_TERMINAL' });
      const [event] = world.events.all();
      expect(event).toMatchObject({
        motivo: 'DISTANTE_DO_TERMINAL',
        authorizationId: AUTHORIZATION_ID,
      });
      expect(event?.distanciaM).toBeCloseTo(101, 0);
      expect(world.commands.all()[0]).toMatchObject({
        tipo: 'NEGAR',
        motivo: 'DISTANTE_DO_TERMINAL',
      });
      expectNothingConsumed(world);
    });

    it('deve aceitar a distância exatamente igual ao limite e negar um pouco acima', async () => {
      const limit = haversineDistanceM(north99m, atTheTerminal);

      const exact = makeSut({ maxDistanceM: limit });
      await exact.seed();
      expect((await exact.validate(north99m)).granted).toBe(true);

      const above = makeSut({ maxDistanceM: limit - 0.001 });
      await above.seed();
      expect(await above.validate(north99m)).toEqual({
        granted: false,
        reason: 'DISTANTE_DO_TERMINAL',
      });
    });

    it('deve seguir o limite configurado', async () => {
      const world = makeSut({ maxDistanceM: 50 });
      await world.seed();

      expect(await world.validate(north99m)).toEqual({
        granted: false,
        reason: 'DISTANTE_DO_TERMINAL',
      });
    });
  });

  describe('posição de referência do terminal', () => {
    /** The terminal reported `spot` with a fix at `contatoEm`. */
    const reportGps = (world: ReturnType<typeof makeSut>, contatoEm: Date, gpsFix = true) =>
      world.terminals.updateHeartbeat(
        TERMINAL_ID,
        { contatoEm, gpsFix, gpsSimulado: false, firmware: '0.3.0', rssi: -60, posicao: gpsSpot },
        new Date(0),
      );
    const secondsAgo = (world: ReturnType<typeof makeSut>, seconds: number) =>
      new Date(world.clock.now().getTime() - seconds * 1000);

    it('deve medir a partir do GPS quando o terminal tem fix recente', async () => {
      const world = makeSut();
      await world.seed();
      await reportGps(world, secondsAgo(world, 30));

      expect(await world.validate(gpsSpot)).toMatchObject({ granted: true, distanceM: 0 });

      const far = makeSut();
      await far.seed();
      await reportGps(far, secondsAgo(far, 30));
      expect(await far.validate(atTheTerminal)).toEqual({
        granted: false,
        reason: 'DISTANTE_DO_TERMINAL',
      });
    });

    it('deve voltar ao cadastro quando o GPS é antigo (10 min) e usar o GPS com 9 min 59 s', async () => {
      const old = makeSut();
      await old.seed();
      await reportGps(old, secondsAgo(old, 600));
      expect((await old.validate(atTheTerminal)).granted).toBe(true);

      const fresh = makeSut();
      await fresh.seed();
      await reportGps(fresh, secondsAgo(fresh, 599));
      expect((await fresh.validate(atTheTerminal)).granted).toBe(false);
    });

    it('deve voltar ao cadastro quando o terminal está sem fix', async () => {
      const world = makeSut();
      await world.seed();
      await reportGps(world, secondsAgo(world, 30), false);

      expect((await world.validate(atTheTerminal)).granted).toBe(true);
    });

    it('deve ignorar o GPS no modo CADASTRO', async () => {
      const world = makeSut({ positionSource: 'CADASTRO' });
      await world.seed();
      await reportGps(world, secondsAgo(world, 30));

      expect((await world.validate(atTheTerminal)).granted).toBe(true);
    });

    it('deve negar com LOCALIZACAO_INVALIDA no modo GPS quando o terminal não tem GPS utilizável', async () => {
      const world = makeSut({ positionSource: 'GPS' });
      await world.seed();

      const decision = await world.validate();

      expect(decision).toEqual({ granted: false, reason: 'LOCALIZACAO_INVALIDA' });
      expect(world.events.all()[0]).toMatchObject({
        motivo: 'LOCALIZACAO_INVALIDA',
        authorizationId: AUTHORIZATION_ID,
        distanciaM: null,
      });
    });

    it('deve usar o GPS no modo GPS quando ele é recente', async () => {
      const world = makeSut({ positionSource: 'GPS' });
      await world.seed();
      await reportGps(world, secondsAgo(world, 30));

      expect((await world.validate(gpsSpot)).granted).toBe(true);
    });
  });

  describe('corrida perdida e falhas de gravação', () => {
    it.each([['CREDENCIAL_REUTILIZADA' as const], ['USOS_ESGOTADOS' as const]])(
      'deve virar a negação %s, com evento e comando NEGAR, quando commitApproval perde a corrida',
      async (reason) => {
        const world = makeSut();
        await world.seed();
        vi.spyOn(world.accessGrants, 'commitApproval').mockResolvedValueOnce({ ok: false, reason });

        const decision = await world.validate();

        expect(decision).toEqual({ granted: false, reason });
        expect(world.events.all()).toHaveLength(1);
        expect(world.events.all()[0]).toMatchObject({
          resultado: 'NEGADO',
          motivo: reason,
          terminalId: TERMINAL_ID,
          usuarioId: USER_ID,
          authorizationId: null,
          distanciaM: null,
        });
        expect(world.commands.all()).toHaveLength(1);
        expect(world.commands.all()[0]).toMatchObject({ tipo: 'NEGAR', motivo: reason });
      },
    );

    it('deve deixar a exceção de commitApproval subir, sem comando ABRIR', async () => {
      const world = makeSut();
      await world.seed();
      vi.spyOn(world.accessGrants, 'commitApproval').mockRejectedValueOnce(new Error('banco fora'));

      await expect(world.validate()).rejects.toThrow('banco fora');

      expect(world.commands.all()).toHaveLength(0);
      expectNothingConsumed(world);
    });

    it('deve subir a falha quando o evento da aprovação não é gravado, sem consumir uso nem credencial', async () => {
      const world = makeSut();
      await world.seed();
      world.events.failWith(new Error('disco cheio'));

      await expect(world.validate()).rejects.toThrow('disco cheio');

      expectNothingConsumed(world);
      expect(world.commands.all()).toHaveLength(0);
      expect(world.events.all()).toHaveLength(0);
    });

    it('deve manter a negação quando o evento da negação não é gravado, e ainda mandar o NEGAR', async () => {
      const world = makeSut();
      await world.seed();
      world.events.failWith(new Error('disco cheio'));
      world.clock.set(new Date(T0.getTime() + 16_000));

      const decision = await world.validate();

      expect(decision).toEqual({ granted: false, reason: 'CREDENCIAL_EXPIRADA' });
      expect(world.commands.all()[0]).toMatchObject({
        tipo: 'NEGAR',
        motivo: 'CREDENCIAL_EXPIRADA',
      });
      expect(world.logger.of('error')).toHaveLength(1);
    });

    it('deve manter a negação e registrar no log quando o comando NEGAR não é gravado', async () => {
      const world = makeSut();
      await world.seed();
      world.commands.failWith(new Error('fila indisponível'));
      world.clock.set(new Date(T0.getTime() + 16_000));

      const decision = await world.validate();

      expect(decision).toEqual({ granted: false, reason: 'CREDENCIAL_EXPIRADA' });
      expect(world.events.all()).toHaveLength(1);
      const [logged] = world.logger.of('error');
      expect(logged?.meta).toMatchObject({
        motivo: 'CREDENCIAL_EXPIRADA',
        terminalId: TERMINAL_ID,
        erro: 'fila indisponível',
      });
      expect(JSON.stringify(world.logger.entries)).not.toContain(TOKEN);
      expect(JSON.stringify(world.logger.entries)).not.toContain(world.hash.sha256(TOKEN));
    });
  });

  describe('efeitos de uma negação', () => {
    it('deve gravar um evento NEGADO com o motivo e criar um comando NEGAR para o terminal, sem consumir nada', async () => {
      const world = makeSut();
      await world.seed();
      world.clock.set(new Date(T0.getTime() + 16_000));

      await world.validate({ precisaoMetros: 8 });

      expect(world.events.all()).toHaveLength(1);
      expect(world.events.all()[0]).toMatchObject({
        resultado: 'NEGADO',
        motivo: 'CREDENCIAL_EXPIRADA',
        metodo: 'QR',
        terminalId: TERMINAL_ID,
        accessPointId: POINT_ID,
        usuarioId: USER_ID,
        authorizationId: null,
        distanciaM: null,
        detalhes: { precisaoMetros: 8 },
      });
      expect(world.commands.all()).toHaveLength(1);
      expect(world.commands.all()[0]).toMatchObject({
        terminalId: TERMINAL_ID,
        tipo: 'NEGAR',
        motivo: 'CREDENCIAL_EXPIRADA',
        aberturaMs: null,
        criadoEm: new Date(T0.getTime() + 16_000),
        expiraEm: new Date(T0.getTime() + 26_000),
      });
      expectNothingConsumed(world);
    });
    type World = ReturnType<typeof makeSut>;
    /** The commands the terminal must get: one `NEGAR`, except when the credential is unknown. */
    const told = (reason: QrDenialReason) => [{ tipo: 'NEGAR', motivo: reason }];
    const replaceAuthorization = (
      world: World,
      overrides: Parameters<typeof makeAuthorization>[0],
    ) => {
      world.authorizations.clear();
      world.authorizations.add(
        makeAuthorization({
          id: AUTHORIZATION_ID,
          usuarioId: USER_ID,
          accessPointId: POINT_ID,
          dataInicio: '2026-10-01',
          dataFim: '2026-10-31',
          ...overrides,
        }),
      );
    };

    /** One way to provoke each of the ten reasons, and what the terminal must be told. */
    const scenarios: Array<{
      reason: QrDenialReason;
      arrange: (
        world: World,
      ) => Promise<Partial<ValidateQrAccessInput>> | Partial<ValidateQrAccessInput>;
      commands: Array<{ tipo: string; motivo: string }>;
    }> = [
      {
        reason: 'CREDENCIAL_INVALIDA',
        arrange: () => ({ payload: 'ACS1:aaaaaaaaaaaaaaaaaaaaaa' }),
        // An unknown credential identifies no terminal, so no one is told.
        commands: [],
      },
      {
        reason: 'CREDENCIAL_EXPIRADA',
        arrange: (world) => {
          world.clock.set(new Date(T0.getTime() + 16_000));
          return {};
        },
        commands: told('CREDENCIAL_EXPIRADA'),
      },
      {
        reason: 'CREDENCIAL_REUTILIZADA',
        arrange: (world) => {
          world.credentials.seed(
            makeQrCredential({
              terminalId: TERMINAL_ID,
              tokenHash: world.hash.sha256(TOKEN),
              consumidoEm: T0,
              consumidoPorId: 'outra-pessoa',
            }),
          );
          return {};
        },
        commands: told('CREDENCIAL_REUTILIZADA'),
      },
      {
        reason: 'USUARIO_INATIVO',
        arrange: async (world) => {
          await world.users.save(makeUser({ id: USER_ID, ativo: false }));
          return {};
        },
        commands: told('USUARIO_INATIVO'),
      },
      {
        reason: 'SEM_AUTORIZACAO',
        arrange: (world) => {
          world.authorizations.clear();
          return {};
        },
        commands: told('SEM_AUTORIZACAO'),
      },
      {
        reason: 'AUTORIZACAO_CANCELADA',
        arrange: (world) => {
          replaceAuthorization(world, { situacao: 'CANCELADA' });
          return {};
        },
        commands: told('AUTORIZACAO_CANCELADA'),
      },
      {
        reason: 'FORA_DO_PERIODO',
        arrange: (world) => {
          replaceAuthorization(world, { dataInicio: '2026-09-01', dataFim: '2026-09-30' });
          return {};
        },
        commands: told('FORA_DO_PERIODO'),
      },
      {
        reason: 'USOS_ESGOTADOS',
        arrange: (world) => {
          replaceAuthorization(world, { usosPermitidos: 1, usosRealizados: 1 });
          return {};
        },
        commands: told('USOS_ESGOTADOS'),
      },
      {
        reason: 'DISTANTE_DO_TERMINAL',
        arrange: () => east101m,
        commands: told('DISTANTE_DO_TERMINAL'),
      },
      {
        reason: 'LOCALIZACAO_INVALIDA',
        arrange: () => ({ latitude: undefined }),
        commands: told('LOCALIZACAO_INVALIDA'),
      },
    ];

    it('deve cobrir os dez motivos da validação por QR', () => {
      expect(scenarios.map(({ reason }) => reason)).toEqual([...QR_DENIAL_REASONS]);
    });

    it.each(scenarios)(
      'deve gravar exatamente um evento NEGADO e avisar o terminal para $reason, sem consumir nada',
      async ({ reason, arrange, commands }) => {
        const world = makeSut();
        await world.seed();
        const overrides = await arrange(world);
        const consumedBefore = world.credentials.all().map((c) => c.consumidoEm);
        const usesBefore = world.authorizations.all().map((a) => a.usosRealizados);

        const decision = await world.validate(overrides);

        expect(decision).toEqual({ granted: false, reason });
        expect(world.events.all()).toHaveLength(1);
        expect(world.events.all()[0]).toMatchObject({ resultado: 'NEGADO', motivo: reason });
        expect(world.commands.all().map((c) => ({ tipo: c.tipo, motivo: c.motivo }))).toEqual(
          commands,
        );
        expect(world.credentials.all().map((c) => c.consumidoEm)).toEqual(consumedBefore);
        expect(world.authorizations.all().map((a) => a.usosRealizados)).toEqual(usesBefore);
      },
    );
  });
});
