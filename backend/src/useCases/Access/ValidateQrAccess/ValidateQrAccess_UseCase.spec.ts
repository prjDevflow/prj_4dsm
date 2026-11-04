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
  });
});
