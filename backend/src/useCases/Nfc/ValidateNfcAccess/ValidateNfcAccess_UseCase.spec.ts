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

  /** The default scene: an active tag of an active user with a valid authorization for this terminal's point. */
  const seed = async () => {
    await users.save(makeUser({ id: USER_ID }));
    await accessPoints.save(makeAccessPoint({ id: POINT_ID }));
    await terminals.save(makeTerminal({ id: TERMINAL_ID, accessPointId: POINT_ID }));
    await tags.save(makeNfcTag({ usuarioId: USER_ID, uid: UID }));
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

    it.todo('deve consumir exatamente um uso da autorização');
    it.todo(
      'deve gravar um único evento NFC AUTORIZADO com terminal, ponto, usuário, autorização, chave e UID',
    );
    it.todo('deve deixar distanciaM nulo no evento, porque o NFC não mede distância');
    it.todo('deve aceitar o UID escrito com ":" e minúsculas como a mesma tag');
    it.todo('deve autorizar sem criar comando para o terminal, porque a resposta já é a decisão');
    it.todo(
      'deve autorizar mesmo com o GPS do terminal longe do ponto, porque a distância não é avaliada',
    );
    it.todo('deve usar a autorização de dataFim mais próxima quando há mais de uma');
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
