import { describe, expect, it } from 'vitest';
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
import type { Authorization } from '../../../entities/Authorization';
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
    it.todo('deve negar com TAG_DESCONHECIDA e gravar o evento sem usuário e com o UID');
    it.todo('deve negar com TAG_INATIVA e gravar o evento com o usuário da tag');
    it.todo('deve negar com USUARIO_INATIVO quando o dono da tag está inativo');
    it.todo('deve conferir a tag antes do usuário: tag inativa de usuário inativo dá TAG_INATIVA');
    it.todo('deve conferir a tag e o usuário antes das autorizações');
  });

  describe('negações da autorização', () => {
    it.todo('deve negar com SEM_AUTORIZACAO quando a autorização é de outro local');
    it.todo('deve negar com AUTORIZACAO_CANCELADA quando a autorização está cancelada');
    it.todo('deve negar com FORA_DO_PERIODO fora das datas e fora do horário');
    it.todo('deve negar com USOS_ESGOTADOS quando não há usos');
    it.todo('deve gravar um evento NEGADO por tentativa e nenhum uso consumido nem comando criado');
  });

  describe('idempotência', () => {
    it.todo(
      'deve devolver a decisão anterior, sem novo uso nem novo evento, quando a chave se repete',
    );
    it.todo('deve devolver também a negação anterior quando a chave se repete');
    it.todo('deve recusar com 409 CONFLICT a chave que já pertence a outro terminal');
    it.todo('deve recusar com 409 CONFLICT a chave de um evento que não é uma leitura NFC');
  });

  describe('debounce', () => {
    it.todo(
      'deve devolver a decisão anterior, sem novo evento, quando a mesma tag é lida de novo em menos de 3 s',
    );
    it.todo('deve tratar como nova tentativa a leitura feita exatamente 3 s depois');
    it.todo('deve devolver também a negação anterior dentro da janela');
    it.todo(
      'deve tratar como nova tentativa a leitura de outra tag logo depois, sem herdar a decisão',
    );
    it.todo('deve tratar como nova tentativa a mesma tag lida em outro terminal');
    it.todo('deve usar a janela de NFC_DEBOUNCE_SECONDS da configuração');
  });

  describe('modo de cadastro', () => {
    it.todo('deve vincular a tag ao usuário do modo e responder CADASTRADA, sem uso nem evento');
    it.todo('deve encerrar o modo: a leitura seguinte segue o fluxo normal');
    it.todo('deve ainda vincular no instante exato do prazo e deixar de vincular 1 ms depois');
    it.todo('deve seguir o fluxo normal quando o modo venceu');
    it.todo('deve recusar com 409 TAG_JA_CADASTRADA o UID que já existe, com o modo já gasto');
    it.todo('deve recusar com 422 em usuarioId quando o usuário do modo ficou inativo');
    it.todo('deve preferir o modo de cadastro à decisão anterior do debounce');
  });

  describe('falhas e corridas', () => {
    it.todo(
      'deve negar mesmo quando o evento da negação não pôde ser gravado, e registrar o erro no log',
    );
    it.todo('deve lançar e não consumir uso quando a aprovação não pôde ser gravada');
    it.todo(
      'deve negar com USOS_ESGOTADOS, com evento, quando o último uso foi tomado no meio do caminho',
    );
    it.todo(
      'deve devolver a decisão do evento do concorrente quando a chave foi gravada no meio do caminho',
    );
    it.todo('deve responder 401 quando o terminal não existe mais');
  });
});
