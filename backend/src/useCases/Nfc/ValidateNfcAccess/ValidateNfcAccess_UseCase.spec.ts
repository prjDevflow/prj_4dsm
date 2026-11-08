import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { InMemoryAccessEventRepository } from '../../../../test/doubles/InMemoryAccessEventRepository';
import { InMemoryAccessGrantRepository } from '../../../../test/doubles/InMemoryAccessGrantRepository';
import { makeLocationDoubles } from '../../../../test/doubles/InMemoryLocationUnitOfWork';
import { InMemoryNfcTagRepository } from '../../../../test/doubles/InMemoryNfcTagRepository';
import { InMemoryQrCredentialRepository } from '../../../../test/doubles/InMemoryQrCredentialRepository';
import { InMemoryTerminalCommandRepository } from '../../../../test/doubles/InMemoryTerminalCommandRepository';
import { InMemoryTerminalRepository } from '../../../../test/doubles/InMemoryTerminalRepository';
import { SequentialIdGenerator } from '../../../../test/doubles/SequentialIdGenerator';
import { SpyLogger } from '../../../../test/doubles/SpyLogger';
import { makeAccessPoint } from '../../../../test/factories/makeAccessPoint';
import { makeAuthorization } from '../../../../test/factories/makeAuthorization';
import { makeNfcTag } from '../../../../test/factories/makeNfcTag';
import { makeTerminal } from '../../../../test/factories/makeTerminal';
import { makeUser } from '../../../../test/factories/makeUser';
import { AccessEvent } from '../../../entities/AccessEvent';
import type { Authorization } from '../../../entities/Authorization';
import type { NfcDenialReason } from '../../../entities/DenialReason';
import type { NfcTag } from '../../../entities/NfcTag';
import type { Terminal } from '../../../entities/Terminal';
import type { User } from '../../../entities/User';
import { AccessEventRecorder } from '../../Events/AccessEventRecorder';
import {
  ValidateNfcAccessUseCase,
  type ValidateNfcAccessConfig,
  type ValidateNfcAccessInput,
} from './ValidateNfcAccess_UseCase';

const USER_ID = '00000000-0000-4000-8000-0000000000e1';
const TERMINAL_ID = '00000000-0000-4000-8000-0000000000a9';
const POINT_ID = '00000000-0000-4000-8000-0000000000c1';
const AUTHORIZATION_ID = '00000000-0000-4000-8000-0000000000a1';
const UID = '04A1B2C3';
const KEY = '3f1c9a52-8e0b-4f55-9d57-2a6f0c1d7e44';

const defaultConfig: ValidateNfcAccessConfig = { debounceSeconds: 3, aberturaMs: 5000 };

interface Scene {
  user?: Partial<User>;
  terminal?: Partial<Terminal>;
  tag?: Partial<NfcTag> | null;
  authorization?: Partial<Authorization> | null;
}

const makeSut = (config: Partial<ValidateNfcAccessConfig> = {}) => {
  const { accessPoints, authorizations, users } = makeLocationDoubles();
  const terminals = new InMemoryTerminalRepository();
  const tags = new InMemoryNfcTagRepository();
  const events = new InMemoryAccessEventRepository();
  const commands = new InMemoryTerminalCommandRepository();
  const accessGrants = new InMemoryAccessGrantRepository(
    new InMemoryQrCredentialRepository(),
    authorizations,
    events,
    commands,
  );
  const ids = new SequentialIdGenerator();
  // 2026-10-20T14:00:00Z: 11:00 in São Paulo, inside the default window of the authorization.
  const clock = new FakeClock();
  const logger = new SpyLogger();
  const recorder = new AccessEventRecorder(events, ids, clock, logger);
  const sut = new ValidateNfcAccessUseCase(
    terminals,
    tags,
    users,
    authorizations,
    events,
    accessGrants,
    recorder,
    ids,
    clock,
    { ...defaultConfig, ...config },
  );

  /**
   * The default scene: an active tag of an active user with a valid authorization for this terminal's point.
   * `null` leaves out the tag or the authorization.
   */
  const seed = async (scene: Scene = {}) => {
    await users.save(makeUser({ id: USER_ID, ...scene.user }));
    await accessPoints.save(makeAccessPoint({ id: POINT_ID }));
    await terminals.save(
      makeTerminal({ id: TERMINAL_ID, accessPointId: POINT_ID, ...scene.terminal }),
    );
    if (scene.tag !== null) {
      await tags.save(makeNfcTag({ usuarioId: USER_ID, uid: UID, ...scene.tag }));
    }
    if (scene.authorization !== null) {
      authorizations.add(
        makeAuthorization({
          id: AUTHORIZATION_ID,
          usuarioId: USER_ID,
          accessPointId: POINT_ID,
          dataInicio: '2026-10-01',
          dataFim: '2026-10-31',
          usosPermitidos: 3,
          ...scene.authorization,
        }),
      );
    }
  };

  const read = (overrides: Partial<ValidateNfcAccessInput> = {}) =>
    sut.execute({ terminalId: TERMINAL_ID, uid: UID, idempotencyKey: KEY, ...overrides });

  return {
    sut,
    read,
    seed,
    clock,
    logger,
    users,
    terminals,
    accessPoints,
    tags,
    authorizations,
    events,
    commands,
    accessGrants,
  };
};

describe('ValidateNfcAccess', () => {
  describe('caminho feliz', () => {
    it('deve autorizar com aberturaMs quando a tag e a autorização valem', async () => {
      const { read, seed } = makeSut();
      await seed();

      const decision = await read();

      expect(decision).toEqual({ resultado: 'AUTORIZADO', aberturaMs: 5000 });
    });

    it('deve consumir exatamente um uso da autorização', async () => {
      const { read, seed, authorizations } = makeSut();
      await seed();

      await read();

      expect(authorizations.all()[0]?.usosRealizados).toBe(1);
    });

    it('deve gravar um único evento NFC AUTORIZADO com terminal, ponto, usuário, autorização, chave e UID', async () => {
      const { read, seed, events, clock } = makeSut();
      await seed();

      await read();

      expect(events.all()).toHaveLength(1);
      expect(events.all()[0]).toMatchObject({
        metodo: 'NFC',
        resultado: 'AUTORIZADO',
        motivo: null,
        terminalId: TERMINAL_ID,
        accessPointId: POINT_ID,
        usuarioId: USER_ID,
        authorizationId: AUTHORIZATION_ID,
        clientEventId: KEY,
        detalhes: { uid: UID },
        ocorridoEm: clock.now(),
      });
    });

    it('deve deixar distanciaM nulo no evento, porque o NFC não mede distância', async () => {
      const { read, seed, events } = makeSut();
      await seed();

      await read();

      expect(events.all()[0]?.distanciaM).toBeNull();
    });

    it('deve aceitar o UID escrito com ":" e minúsculas como a mesma tag', async () => {
      const { read, seed, events } = makeSut();
      await seed();

      const decision = await read({ uid: '04:a1:b2:c3' });

      expect(decision.resultado).toBe('AUTORIZADO');
      expect(events.all()[0]?.detalhes).toEqual({ uid: UID });
    });

    it('deve autorizar sem criar comando para o terminal, porque a resposta já é a decisão', async () => {
      const { read, seed, commands } = makeSut();
      await seed();

      await read();

      expect(commands.all()).toHaveLength(0);
    });

    it('deve autorizar mesmo com o GPS do terminal longe do ponto, porque a distância não é avaliada', async () => {
      const { read, seed, clock } = makeSut();
      // About 5 km from the registered position of the access point.
      await seed({
        terminal: {
          gpsFix: true,
          ultimaLat: -23.26012,
          ultimaLon: -45.96551,
          ultimoContatoEm: clock.now(),
        },
      });

      expect(await read()).toEqual({ resultado: 'AUTORIZADO', aberturaMs: 5000 });
    });

    it('deve usar a autorização de dataFim mais próxima quando há mais de uma', async () => {
      const { read, seed, authorizations, events } = makeSut();
      await seed();
      const sooner = makeAuthorization({
        id: '00000000-0000-4000-8000-0000000000a2',
        usuarioId: USER_ID,
        accessPointId: POINT_ID,
        dataInicio: '2026-10-01',
        dataFim: '2026-10-25',
      });
      authorizations.add(sooner);

      await read();

      expect(authorizations.all().find((a) => a.id === sooner.id)?.usosRealizados).toBe(1);
      expect(authorizations.all().find((a) => a.id === AUTHORIZATION_ID)?.usosRealizados).toBe(0);
      expect(events.all()[0]?.authorizationId).toBe(sooner.id);
    });
  });

  describe('negações da tag e da pessoa', () => {
    it('deve negar com TAG_DESCONHECIDA quando nenhuma tag tem o UID', async () => {
      const { read, seed } = makeSut();
      await seed({ tag: null });

      expect(await read()).toEqual({ resultado: 'NEGADO', motivo: 'TAG_DESCONHECIDA' });
    });

    it('deve gravar o evento da tag desconhecida sem usuário e com o UID', async () => {
      const { read, seed, events } = makeSut();
      await seed({ tag: null });

      await read();

      expect(events.all()).toHaveLength(1);
      expect(events.all()[0]).toMatchObject({
        metodo: 'NFC',
        resultado: 'NEGADO',
        motivo: 'TAG_DESCONHECIDA',
        usuarioId: null,
        authorizationId: null,
        terminalId: TERMINAL_ID,
        accessPointId: POINT_ID,
        distanciaM: null,
        clientEventId: KEY,
        detalhes: { uid: UID },
      });
    });

    it('deve negar com TAG_INATIVA e gravar o evento com o usuário da tag', async () => {
      const { read, seed, events } = makeSut();
      await seed({ tag: { ativa: false } });

      const decision = await read();

      expect(decision).toEqual({ resultado: 'NEGADO', motivo: 'TAG_INATIVA' });
      expect(events.all()).toHaveLength(1);
      expect(events.all()[0]).toMatchObject({
        resultado: 'NEGADO',
        motivo: 'TAG_INATIVA',
        usuarioId: USER_ID,
        authorizationId: null,
        clientEventId: KEY,
        detalhes: { uid: UID },
      });
    });

    it('deve negar com USUARIO_INATIVO quando o dono da tag está inativo', async () => {
      const { read, seed, events } = makeSut();
      await seed({ user: { ativo: false } });

      const decision = await read();

      expect(decision).toEqual({ resultado: 'NEGADO', motivo: 'USUARIO_INATIVO' });
      expect(events.all()).toHaveLength(1);
      expect(events.all()[0]).toMatchObject({ motivo: 'USUARIO_INATIVO', usuarioId: USER_ID });
    });

    it('deve conferir a tag antes do usuário: tag inativa de usuário inativo dá TAG_INATIVA', async () => {
      const { read, seed } = makeSut();
      await seed({ tag: { ativa: false }, user: { ativo: false } });

      expect(await read()).toEqual({ resultado: 'NEGADO', motivo: 'TAG_INATIVA' });
    });

    it('deve conferir a tag e o usuário antes das autorizações', async () => {
      const unknownTag = makeSut();
      await unknownTag.seed({ tag: null, authorization: null });
      const inactiveUser = makeSut();
      await inactiveUser.seed({ user: { ativo: false }, authorization: null });

      expect(await unknownTag.read()).toMatchObject({ motivo: 'TAG_DESCONHECIDA' });
      expect(await inactiveUser.read()).toMatchObject({ motivo: 'USUARIO_INATIVO' });
    });

    it('não deve consumir uso nem criar comando ao negar a tag ou a pessoa', async () => {
      const { read, seed, authorizations, commands } = makeSut();
      await seed({ tag: { ativa: false } });

      await read();

      expect(authorizations.all()[0]?.usosRealizados).toBe(0);
      expect(commands.all()).toHaveLength(0);
    });
  });

  describe('negações da autorização', () => {
    // 2026-10-20T14:00:00Z is 11:00 on 2026-10-20 in São Paulo.
    const cases: [string, Partial<Authorization>, NfcDenialReason][] = [
      [
        'a autorização é de outro local',
        { accessPointId: '00000000-0000-4000-8000-0000000000c2' },
        'SEM_AUTORIZACAO',
      ],
      ['a autorização está cancelada', { situacao: 'CANCELADA' }, 'AUTORIZACAO_CANCELADA'],
      ['o período ainda não começou', { dataInicio: '2026-10-21' }, 'FORA_DO_PERIODO'],
      ['o período terminou ontem', { dataFim: '2026-10-19' }, 'FORA_DO_PERIODO'],
      [
        'o horário só começa mais tarde',
        { horaInicio: '11:01', horaFim: '18:00' },
        'FORA_DO_PERIODO',
      ],
      [
        'o horário terminou um minuto antes',
        { horaInicio: '08:00', horaFim: '10:59' },
        'FORA_DO_PERIODO',
      ],
      ['os usos acabaram', { usosRealizados: 3 }, 'USOS_ESGOTADOS'],
    ];

    it.each(cases)(
      'deve negar com o motivo certo quando %s',
      async (_name, authorization, reason) => {
        const { read, seed } = makeSut();
        await seed({ authorization });

        expect(await read()).toEqual({ resultado: 'NEGADO', motivo: reason });
      },
    );

    it.each(cases)(
      'deve gravar um evento NEGADO sem autorização, sem consumir uso e sem criar comando quando %s',
      async (_name, authorization, reason) => {
        const { read, seed, events, authorizations, commands } = makeSut();
        await seed({ authorization });
        const spentBefore = authorization.usosRealizados ?? 0;

        await read();

        expect(events.all()).toHaveLength(1);
        expect(events.all()[0]).toMatchObject({
          metodo: 'NFC',
          resultado: 'NEGADO',
          motivo: reason,
          usuarioId: USER_ID,
          terminalId: TERMINAL_ID,
          accessPointId: POINT_ID,
          authorizationId: null,
          distanciaM: null,
          clientEventId: KEY,
          detalhes: { uid: UID },
        });
        expect(authorizations.all()[0]?.usosRealizados).toBe(spentBefore);
        expect(commands.all()).toHaveLength(0);
      },
    );

    it('deve autorizar no minuto exato em que o horário começa e naquele em que termina', async () => {
      const start = makeSut();
      await start.seed({ authorization: { horaInicio: '11:00', horaFim: '18:00' } });
      const end = makeSut();
      await end.seed({ authorization: { horaInicio: '08:00', horaFim: '11:00' } });

      expect(await start.read()).toMatchObject({ resultado: 'AUTORIZADO' });
      expect(await end.read()).toMatchObject({ resultado: 'AUTORIZADO' });
    });
  });

  describe('idempotência', () => {
    // The clock moves a minute between the reads, so the debounce can never explain what the key explains.
    const MINUTE = 60_000;

    it('deve devolver a decisão anterior, sem novo uso nem novo evento, quando a chave se repete', async () => {
      const { read, seed, clock, authorizations, events } = makeSut();
      await seed();

      const first = await read();
      clock.advance(MINUTE);
      const again = await read();

      expect(first).toEqual({ resultado: 'AUTORIZADO', aberturaMs: 5000 });
      expect(again).toEqual(first);
      expect(authorizations.all()[0]?.usosRealizados).toBe(1);
      expect(events.all()).toHaveLength(1);
    });

    it('deve devolver também a negação anterior quando a chave se repete, sem tentar gravar de novo', async () => {
      const { read, seed, clock, events, logger } = makeSut();
      await seed({ tag: null });

      await read();
      clock.advance(MINUTE);
      const again = await read();

      expect(again).toEqual({ resultado: 'NEGADO', motivo: 'TAG_DESCONHECIDA' });
      expect(events.all()).toHaveLength(1);
      // A second write would be refused by the unique key and logged: the retry must not even try.
      expect(logger.of('error')).toHaveLength(0);
    });

    it('deve devolver a decisão original mesmo que a tag tenha sido desativada depois', async () => {
      const { read, seed, clock, tags } = makeSut();
      await seed();
      await read();
      const tag = tags.all()[0];
      await tags.updateStatus(tag!.id, false);
      clock.advance(MINUTE);

      expect(await read()).toEqual({ resultado: 'AUTORIZADO', aberturaMs: 5000 });
    });

    it('deve tratar uma chave nova como nova leitura, com outro uso e outro evento', async () => {
      const { read, seed, clock, authorizations, events } = makeSut();
      await seed();

      await read();
      clock.advance(MINUTE);
      await read({ idempotencyKey: '7d2e4b10-1c3a-4e9f-8a66-0b5c9d1e2f33' });

      expect(authorizations.all()[0]?.usosRealizados).toBe(2);
      expect(events.all()).toHaveLength(2);
    });

    const foreignEvents: [string, Partial<Parameters<typeof AccessEvent.denied>[0]>][] = [
      ['de outro terminal', { terminalId: '00000000-0000-4000-8000-0000000000a8' }],
      ['de uma leitura de QR', { metodo: 'QR', motivo: 'CREDENCIAL_INVALIDA' }],
      ['de um evento enviado depois pelo terminal', { motivo: 'TERMINAL_OFFLINE' }],
    ];

    it.each(foreignEvents)(
      'deve recusar com 409 CONFLICT, sem tocar em nada, a chave que já é %s',
      async (_name, overrides) => {
        const { read, seed, events, authorizations } = makeSut();
        await seed();
        await events.append(
          AccessEvent.denied({
            id: '00000000-0000-4000-8000-0000000000f0',
            ocorridoEm: new Date('2026-10-20T13:00:00Z'),
            metodo: 'NFC',
            terminalId: TERMINAL_ID,
            motivo: 'TAG_INATIVA',
            clientEventId: KEY,
            ...overrides,
          }),
        );

        await expect(read()).rejects.toMatchObject({ status: 409, code: 'CONFLICT' });

        expect(events.all()).toHaveLength(1);
        expect(authorizations.all()[0]?.usosRealizados).toBe(0);
      },
    );
  });

  describe('debounce', () => {
    const SECOND_KEY = '7d2e4b10-1c3a-4e9f-8a66-0b5c9d1e2f33';

    it('deve devolver a decisão anterior, sem novo evento nem novo uso, quando a mesma tag é lida de novo em menos de 3 s', async () => {
      const { read, seed, clock, authorizations, events } = makeSut();
      await seed();

      const first = await read();
      clock.advance(2999);
      const again = await read({ idempotencyKey: SECOND_KEY });

      expect(again).toEqual(first);
      expect(authorizations.all()[0]?.usosRealizados).toBe(1);
      expect(events.all()).toHaveLength(1);
    });

    it('deve tratar como nova tentativa a leitura feita exatamente 3 s depois', async () => {
      const { read, seed, clock, authorizations, events } = makeSut();
      await seed();

      await read();
      clock.advance(3000);
      await read({ idempotencyKey: SECOND_KEY });

      expect(authorizations.all()[0]?.usosRealizados).toBe(2);
      expect(events.all()).toHaveLength(2);
    });

    it('deve devolver também a negação anterior dentro da janela', async () => {
      const { read, seed, clock, events } = makeSut();
      await seed({ tag: { ativa: false } });

      await read();
      clock.advance(1000);
      const again = await read({ idempotencyKey: SECOND_KEY });

      expect(again).toEqual({ resultado: 'NEGADO', motivo: 'TAG_INATIVA' });
      expect(events.all()).toHaveLength(1);
    });

    it('deve tratar como nova tentativa a leitura de outra tag logo depois, sem herdar a decisão', async () => {
      const { read, seed, clock, users, tags, events } = makeSut();
      await seed();
      const strangerId = '00000000-0000-4000-8000-0000000000e2';
      await users.save(makeUser({ id: strangerId, email: 'outra@teste.local' }));
      await tags.save(
        makeNfcTag({
          id: '00000000-0000-4000-8000-0000000000f2',
          usuarioId: strangerId,
          uid: '04FFEEDD',
        }),
      );

      expect(await read()).toMatchObject({ resultado: 'AUTORIZADO' });
      clock.advance(500);
      const other = await read({ uid: '04FFEEDD', idempotencyKey: SECOND_KEY });

      // The other person has no authorization: the open door of the first one is not theirs.
      expect(other).toEqual({ resultado: 'NEGADO', motivo: 'SEM_AUTORIZACAO' });
      expect(events.all()).toHaveLength(2);
    });

    it('deve tratar como nova tentativa a mesma tag lida em outro terminal', async () => {
      const { read, seed, clock, accessPoints, terminals, authorizations, events } = makeSut();
      await seed();
      const otherPointId = '00000000-0000-4000-8000-0000000000c2';
      const otherTerminalId = '00000000-0000-4000-8000-0000000000a8';
      await accessPoints.save(makeAccessPoint({ id: otherPointId, identificacao: 'CAT-02' }));
      await terminals.save(makeTerminal({ id: otherTerminalId, accessPointId: otherPointId }));
      authorizations.add(
        makeAuthorization({
          id: '00000000-0000-4000-8000-0000000000a2',
          usuarioId: USER_ID,
          accessPointId: otherPointId,
        }),
      );

      await read();
      clock.advance(500);
      const elsewhere = await read({ terminalId: otherTerminalId, idempotencyKey: SECOND_KEY });

      expect(elsewhere).toEqual({ resultado: 'AUTORIZADO', aberturaMs: 5000 });
      expect(events.all()).toHaveLength(2);
      expect(events.all()[1]?.terminalId).toBe(otherTerminalId);
    });

    it('deve usar a janela de NFC_DEBOUNCE_SECONDS da configuração', async () => {
      const { read, seed, clock, events } = makeSut({ debounceSeconds: 10 });
      await seed();

      await read();
      clock.advance(9999);
      await read({ idempotencyKey: SECOND_KEY });
      expect(events.all()).toHaveLength(1);

      clock.advance(1);
      await read({ idempotencyKey: '0a9b8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d' });
      expect(events.all()).toHaveLength(2);
    });
  });

  describe('modo de cadastro', () => {
    /** The terminal waits for a tag of USER_ID until one minute after the default instant of the clock. */
    const ENROLL_UNTIL = new Date('2026-10-20T14:01:00Z');
    const enrolling = { modoCadastroUsuarioId: USER_ID, modoCadastroAte: ENROLL_UNTIL };
    const SECOND_KEY = '7d2e4b10-1c3a-4e9f-8a66-0b5c9d1e2f33';

    it('deve vincular a tag ao usuário do modo e responder CADASTRADA', async () => {
      const { read, seed, tags, clock } = makeSut();
      await seed({ tag: null, terminal: enrolling });

      const decision = await read({ uid: '04:a1:b2:c3' });

      expect(decision).toEqual({ resultado: 'CADASTRADA' });
      expect(tags.all()).toEqual([
        {
          id: expect.any(String),
          usuarioId: USER_ID,
          uid: UID,
          descricao: null,
          ativa: true,
          criadaEm: clock.now(),
        },
      ]);
    });

    it('não deve consumir uso, gravar evento nem criar comando ao cadastrar', async () => {
      const { read, seed, authorizations, events, commands } = makeSut();
      await seed({ tag: null, terminal: enrolling });

      await read();

      expect(authorizations.all()[0]?.usosRealizados).toBe(0);
      expect(events.all()).toHaveLength(0);
      expect(commands.all()).toHaveLength(0);
    });

    it('deve encerrar o modo: a leitura seguinte já usa a tag e segue o fluxo normal', async () => {
      const { read, seed, clock, terminals, authorizations, events } = makeSut();
      await seed({ tag: null, terminal: enrolling });

      await read();
      clock.advance(5000);
      const next = await read({ idempotencyKey: SECOND_KEY });

      const terminal = await terminals.findById(TERMINAL_ID);
      expect(terminal).toMatchObject({ modoCadastroUsuarioId: null, modoCadastroAte: null });
      expect(next).toEqual({ resultado: 'AUTORIZADO', aberturaMs: 5000 });
      expect(authorizations.all()[0]?.usosRealizados).toBe(1);
      expect(events.all()).toHaveLength(1);
    });

    it('deve ainda vincular no instante exato do prazo', async () => {
      const { read, seed, clock } = makeSut();
      await seed({ tag: null, terminal: enrolling });
      clock.set(ENROLL_UNTIL);

      expect(await read()).toEqual({ resultado: 'CADASTRADA' });
    });

    it('deve seguir o fluxo normal 1 ms depois do prazo, sem vincular nada', async () => {
      const { read, seed, clock, tags, events } = makeSut();
      await seed({ tag: null, terminal: enrolling });
      clock.set(new Date(ENROLL_UNTIL.getTime() + 1));

      expect(await read()).toEqual({ resultado: 'NEGADO', motivo: 'TAG_DESCONHECIDA' });
      expect(tags.all()).toHaveLength(0);
      expect(events.all()).toHaveLength(1);
    });

    it('deve seguir o fluxo normal quando o terminal nunca esteve em modo de cadastro', async () => {
      const { read, seed } = makeSut();
      await seed({ tag: null });

      expect(await read()).toEqual({ resultado: 'NEGADO', motivo: 'TAG_DESCONHECIDA' });
    });

    it('deve recusar com 409 TAG_JA_CADASTRADA o UID que já existe, com o modo já gasto', async () => {
      const { read, seed, terminals, tags, events } = makeSut();
      await seed({ terminal: enrolling });

      await expect(read()).rejects.toMatchObject({ status: 409, code: 'TAG_JA_CADASTRADA' });

      const terminal = await terminals.findById(TERMINAL_ID);
      expect(terminal?.modoCadastroUsuarioId).toBeNull();
      expect(tags.all()).toHaveLength(1);
      expect(events.all()).toHaveLength(0);
    });

    it('deve recusar com 422 em usuarioId quando o usuário do modo ficou inativo', async () => {
      const { read, seed, tags } = makeSut();
      await seed({ tag: null, user: { ativo: false }, terminal: enrolling });

      await expect(read()).rejects.toMatchObject({
        status: 422,
        details: [{ field: 'usuarioId', message: 'Usuário inativo' }],
      });
      expect(tags.all()).toHaveLength(0);
    });

    it('deve recusar com 404 quando o usuário do modo não existe mais', async () => {
      const { read, seed } = makeSut();
      await seed({
        tag: null,
        terminal: {
          modoCadastroUsuarioId: '00000000-0000-4000-8000-0000000000e9',
          modoCadastroAte: ENROLL_UNTIL,
        },
      });

      await expect(read()).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });

    it('deve preferir o modo de cadastro à decisão anterior do debounce', async () => {
      const { read, seed, clock, terminals, tags } = makeSut();
      await seed({ tag: null });

      // The tag is read before the mode is turned on, and denied as unknown.
      expect(await read()).toMatchObject({ motivo: 'TAG_DESCONHECIDA' });
      await terminals.updateEnrollMode(TERMINAL_ID, USER_ID, ENROLL_UNTIL);
      clock.advance(1000);
      const decision = await read({ idempotencyKey: SECOND_KEY });

      expect(decision).toEqual({ resultado: 'CADASTRADA' });
      expect(tags.all()).toHaveLength(1);
    });
  });

  describe('falhas e corridas', () => {
    it('deve negar mesmo quando o evento da negação não pôde ser gravado, e registrar o erro no log', async () => {
      const { read, seed, events, logger } = makeSut();
      await seed({ tag: { ativa: false } });
      events.failWith(new Error('banco indisponível'));

      const decision = await read();

      expect(decision).toEqual({ resultado: 'NEGADO', motivo: 'TAG_INATIVA' });
      expect(logger.of('error')).toHaveLength(1);
    });

    it('deve lançar e não consumir uso quando a aprovação não pôde ser gravada', async () => {
      const { read, seed, events, authorizations } = makeSut();
      await seed();
      events.failWith(new Error('banco indisponível'));

      await expect(read()).rejects.toThrow('banco indisponível');

      expect(authorizations.all()[0]?.usosRealizados).toBe(0);
      expect(events.all()).toHaveLength(0);
    });

    it('deve negar com USOS_ESGOTADOS, com evento, quando os usos foram tomados no meio do caminho', async () => {
      const { read, seed, accessGrants, authorizations, events } = makeSut();
      await seed();
      const commit = accessGrants.commitNfcApproval.bind(accessGrants);
      vi.spyOn(accessGrants, 'commitNfcApproval').mockImplementation((input) => {
        // Other reads spend every use between the evaluation and the commit.
        for (let i = 0; i < 3; i += 1) authorizations.consumeUseIfAvailable(AUTHORIZATION_ID);
        return commit(input);
      });

      const decision = await read();

      expect(decision).toEqual({ resultado: 'NEGADO', motivo: 'USOS_ESGOTADOS' });
      expect(events.all()).toHaveLength(1);
      expect(events.all()[0]).toMatchObject({
        resultado: 'NEGADO',
        motivo: 'USOS_ESGOTADOS',
        authorizationId: null,
        clientEventId: KEY,
      });
    });

    it('deve devolver a decisão do evento do concorrente quando a chave foi gravada no meio do caminho', async () => {
      const { read, seed, accessGrants, authorizations, events } = makeSut();
      await seed();
      const commit = accessGrants.commitNfcApproval.bind(accessGrants);
      vi.spyOn(accessGrants, 'commitNfcApproval').mockImplementation(async (input) => {
        // The same read, sent twice, wins the commit just before this one.
        await commit({ ...input, event: { ...input.event, id: 'evento-do-concorrente' } });
        return commit(input);
      });

      const decision = await read();

      expect(decision).toEqual({ resultado: 'AUTORIZADO', aberturaMs: 5000 });
      expect(events.all()).toHaveLength(1);
      expect(events.all()[0]?.id).toBe('evento-do-concorrente');
      expect(authorizations.all()[0]?.usosRealizados).toBe(1);
    });

    it('deve responder 401 quando o terminal não existe mais', async () => {
      const { read, seed, events } = makeSut();
      await seed();

      await expect(
        read({ terminalId: '00000000-0000-4000-8000-0000000000aa' }),
      ).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
      expect(events.all()).toHaveLength(0);
    });

    it('deve responder 422 em uid quando o UID não pode ser de uma tag, mesmo sem a validação da borda', async () => {
      const { read, seed, events } = makeSut();
      await seed();

      await expect(read({ uid: 'não é hexadecimal' })).rejects.toMatchObject({
        status: 422,
        details: [{ field: 'uid', message: expect.any(String) }],
      });
      expect(events.all()).toHaveLength(0);
    });
  });
});
