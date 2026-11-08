import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { InMemoryAccessEventRepository } from '../../../../test/doubles/InMemoryAccessEventRepository';
import { InMemoryNfcTagRepository } from '../../../../test/doubles/InMemoryNfcTagRepository';
import { InMemoryTerminalRepository } from '../../../../test/doubles/InMemoryTerminalRepository';
import { SequentialIdGenerator } from '../../../../test/doubles/SequentialIdGenerator';
import { makeNfcTag } from '../../../../test/factories/makeNfcTag';
import { makeTerminal } from '../../../../test/factories/makeTerminal';
import { IngestOfflineEventsUseCase, type OfflineEventInput } from './IngestOfflineEvents_UseCase';

const TERMINAL_ID = '00000000-0000-4000-8000-0000000000a9';
const POINT_ID = '00000000-0000-4000-8000-0000000000c1';
const USER_ID = '00000000-0000-4000-8000-0000000000e1';
const UID = '04A1B2C3';

/** Distinct, valid, lowercase UUIDs for the events of a batch. */
const key = (n: number) => `3f1c9a52-8e0b-4f55-9d57-${String(n).padStart(12, '0')}`;

// 2026-10-20T14:00:00Z is the instant of the FakeClock.
const offlineEvent = (n = 1, overrides: Partial<OfflineEventInput> = {}): OfflineEventInput => ({
  clientEventId: key(n),
  metodo: 'NFC',
  uid: UID,
  ocorridoEm: new Date('2026-10-20T13:50:00Z'),
  resultado: 'NEGADO',
  motivo: 'TERMINAL_OFFLINE',
  ...overrides,
});

const makeSut = () => {
  const terminals = new InMemoryTerminalRepository();
  const tags = new InMemoryNfcTagRepository();
  const events = new InMemoryAccessEventRepository();
  const ids = new SequentialIdGenerator();
  const clock = new FakeClock();
  const sut = new IngestOfflineEventsUseCase(terminals, tags, events, ids, clock);

  const seed = async () => {
    await terminals.save(makeTerminal({ id: TERMINAL_ID, accessPointId: POINT_ID }));
  };
  const send = (batch: OfflineEventInput[], terminalId = TERMINAL_ID) =>
    sut.execute({ terminalId, events: batch });

  return { sut, send, seed, terminals, tags, events, ids, clock };
};

describe('IngestOfflineEvents', () => {
  describe('gravação', () => {
    it('deve gravar o evento NFC negado com TERMINAL_OFFLINE, o terminal, o ponto, a chave e o instante enviados', async () => {
      const { send, seed, events } = makeSut();
      await seed();

      await send([offlineEvent(1, { ocorridoEm: new Date('2026-10-20T13:42:10Z') })]);

      expect(events.all()).toHaveLength(1);
      expect(events.all()[0]).toMatchObject({
        terminalId: TERMINAL_ID,
        accessPointId: POINT_ID,
        metodo: 'NFC',
        resultado: 'NEGADO',
        motivo: 'TERMINAL_OFFLINE',
        clientEventId: key(1),
        ocorridoEm: new Date('2026-10-20T13:42:10Z'),
      });
    });

    it('deve guardar o UID normalizado em detalhes.uid e deixar autorização e distância nulas', async () => {
      const { send, seed, events } = makeSut();
      await seed();

      await send([offlineEvent(1, { uid: '04:a1:b2:c3' })]);

      expect(events.all()[0]).toMatchObject({
        detalhes: { uid: '04A1B2C3' },
        authorizationId: null,
        distanciaM: null,
      });
    });

    it('deve devolver os aceitos e zero duplicados num lote novo', async () => {
      const { send, seed } = makeSut();
      await seed();

      const result = await send([offlineEvent(1), offlineEvent(2), offlineEvent(3)]);

      expect(result).toEqual({ aceitos: 3, duplicados: 0 });
    });
  });

  describe('identificação da tag', () => {
    it('deve preencher usuarioId quando o UID é de uma tag conhecida', async () => {
      const { send, seed, tags, events } = makeSut();
      await seed();
      await tags.save(makeNfcTag({ usuarioId: USER_ID, uid: UID }));

      await send([offlineEvent()]);

      expect(events.all()[0]?.usuarioId).toBe(USER_ID);
    });

    it('deve preencher usuarioId também quando a tag está desativada', async () => {
      const { send, seed, tags, events } = makeSut();
      await seed();
      await tags.save(makeNfcTag({ usuarioId: USER_ID, uid: UID, ativa: false }));

      await send([offlineEvent()]);

      expect(events.all()[0]?.usuarioId).toBe(USER_ID);
    });

    it('deve reconhecer a tag mesmo quando o terminal escreve o UID com separadores', async () => {
      const { send, seed, tags, events } = makeSut();
      await seed();
      await tags.save(makeNfcTag({ usuarioId: USER_ID, uid: UID }));

      await send([offlineEvent(1, { uid: '04-a1-b2-c3' })]);

      expect(events.all()[0]?.usuarioId).toBe(USER_ID);
    });

    it('deve deixar usuarioId nulo quando o UID é desconhecido', async () => {
      const { send, seed, events } = makeSut();
      await seed();

      await send([offlineEvent()]);

      expect(events.all()[0]?.usuarioId).toBeNull();
    });

    it('deve identificar cada UID do lote pela própria tag', async () => {
      const { send, seed, tags, events } = makeSut();
      const OTHER_USER = '00000000-0000-4000-8000-0000000000e2';
      await seed();
      await tags.save(makeNfcTag({ id: 'f1', usuarioId: USER_ID, uid: UID }));
      await tags.save(makeNfcTag({ id: 'f2', usuarioId: OTHER_USER, uid: 'AABBCCDD' }));

      await send([
        offlineEvent(1, { uid: UID }),
        offlineEvent(2, { uid: 'AABBCCDD' }),
        offlineEvent(3, { uid: '11223344' }),
      ]);

      expect(events.all().map((e) => e.usuarioId)).toEqual([USER_ID, OTHER_USER, null]);
    });
  });

  it.todo('deve gravar cada evento uma única vez quando o mesmo lote é enviado duas vezes');
  it.todo('deve contar 3 aceitos e 1 duplicado num lote com 3 novos e 1 já recebido');
  it.todo('deve contar como duplicado o evento repetido dentro do mesmo lote');
  it.todo('deve responder 0 aceitos e N duplicados quando o lote inteiro já foi recebido');
  it.todo(
    'deve rejeitar AUTORIZADO com 422 no campo events.N.resultado sem gravar nenhum evento do lote',
  );
  it.todo('deve rejeitar ocorridoEm 6 minutos no futuro e 8 dias no passado');
  it.todo('deve aceitar ocorridoEm 5 minutos no futuro e 7 dias no passado');
  it.todo('deve listar todos os eventos inválidos no details e não gravar nem os válidos');
  it.todo('deve rejeitar metodo QR e motivo diferente de TERMINAL_OFFLINE');
  it.todo('deve propagar a falha de gravação sem contar nada como aceito');
  it.todo('deve recusar com 401 quando o terminal não existe mais');
  it.todo('deve não consumir uso nem alterar a autorização');
});
