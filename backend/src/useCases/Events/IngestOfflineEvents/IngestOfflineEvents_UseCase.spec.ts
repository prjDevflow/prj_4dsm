import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { InMemoryAccessEventRepository } from '../../../../test/doubles/InMemoryAccessEventRepository';
import { InMemoryNfcTagRepository } from '../../../../test/doubles/InMemoryNfcTagRepository';
import { InMemoryTerminalRepository } from '../../../../test/doubles/InMemoryTerminalRepository';
import { SequentialIdGenerator } from '../../../../test/doubles/SequentialIdGenerator';
import { makeNfcTag } from '../../../../test/factories/makeNfcTag';
import { makeTerminal } from '../../../../test/factories/makeTerminal';
import { ValidationError } from '../../../shared/errors/AppError';
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

  describe('duplicados', () => {
    it('deve gravar cada evento uma única vez quando o mesmo lote é enviado duas vezes', async () => {
      const { send, seed, events } = makeSut();
      await seed();
      const batch = [offlineEvent(1), offlineEvent(2), offlineEvent(3)];

      await send(batch);
      await send(batch);

      expect(events.all().map((e) => e.clientEventId)).toEqual([key(1), key(2), key(3)]);
    });

    it('deve responder 0 aceitos e N duplicados quando o lote inteiro já foi recebido', async () => {
      const { send, seed } = makeSut();
      await seed();
      const batch = [offlineEvent(1), offlineEvent(2), offlineEvent(3)];
      await send(batch);

      const again = await send(batch);

      expect(again).toEqual({ aceitos: 0, duplicados: 3 });
    });

    it('deve contar 3 aceitos e 1 duplicado num lote com 3 novos e 1 já recebido', async () => {
      const { send, seed, events } = makeSut();
      await seed();
      await send([offlineEvent(1)]);

      const result = await send([
        offlineEvent(1),
        offlineEvent(2),
        offlineEvent(3),
        offlineEvent(4),
      ]);

      expect(result).toEqual({ aceitos: 3, duplicados: 1 });
      expect(events.all()).toHaveLength(4);
    });

    it('deve contar como duplicado o evento repetido dentro do mesmo lote e ficar com o primeiro', async () => {
      const { send, seed, events } = makeSut();
      await seed();
      const first = new Date('2026-10-20T13:00:00Z');
      const second = new Date('2026-10-20T13:30:00Z');

      const result = await send([
        offlineEvent(1, { ocorridoEm: first }),
        offlineEvent(1, { ocorridoEm: second }),
      ]);

      expect(result).toEqual({ aceitos: 1, duplicados: 1 });
      expect(events.all().map((e) => e.ocorridoEm)).toEqual([first]);
    });

    it('deve gravar duas leituras da mesma tag com chaves diferentes (o terminal leu duas vezes)', async () => {
      const { send, seed, events } = makeSut();
      await seed();

      const result = await send([offlineEvent(1), offlineEvent(2)]);

      expect(result).toEqual({ aceitos: 2, duplicados: 0 });
      expect(events.all()).toHaveLength(2);
    });
  });

  describe('validação do lote', () => {
    const MINUTE = 60 * 1000;
    const DAY = 24 * 60 * MINUTE;
    const NOW = new Date('2026-10-20T14:00:00Z');
    const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs);

    /** What the use case threw, so the test reads the 422 and its details. */
    const rejection = async (attempt: Promise<unknown>) => {
      const error = await attempt.catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ValidationError);
      return error as ValidationError;
    };

    it('deve rejeitar AUTORIZADO com 422 no campo events.N.resultado', async () => {
      const { send, seed } = makeSut();
      await seed();

      const error = await rejection(
        send([offlineEvent(1), offlineEvent(2, { resultado: 'AUTORIZADO' }), offlineEvent(3)]),
      );

      expect(error.status).toBe(422);
      expect(error.details?.map((d) => d.field)).toEqual(['events.1.resultado']);
    });

    it('deve rejeitar o lote inteiro, sem gravar nem os eventos válidos', async () => {
      const { send, seed, events } = makeSut();
      await seed();

      await rejection(
        send([offlineEvent(1), offlineEvent(2, { resultado: 'AUTORIZADO' }), offlineEvent(3)]),
      );

      expect(events.all()).toEqual([]);
    });

    it.each([
      ['6 minutos no futuro', 6 * MINUTE],
      ['5 minutos e 1 ms no futuro', 5 * MINUTE + 1],
      ['8 dias no passado', -8 * DAY],
      ['7 dias e 1 ms no passado', -7 * DAY - 1],
    ])('deve rejeitar ocorridoEm %s no campo events.N.ocorridoEm', async (_label, offset) => {
      const { send, seed } = makeSut();
      await seed();

      const error = await rejection(send([offlineEvent(1, { ocorridoEm: at(offset) })]));

      expect(error.details?.map((d) => d.field)).toEqual(['events.0.ocorridoEm']);
    });

    it.each([
      ['5 minutos no futuro', 5 * MINUTE],
      ['7 dias no passado', -7 * DAY],
    ])('deve aceitar ocorridoEm %s', async (_label, offset) => {
      const { send, seed } = makeSut();
      await seed();

      const result = await send([offlineEvent(1, { ocorridoEm: at(offset) })]);

      expect(result).toEqual({ aceitos: 1, duplicados: 0 });
    });

    it('deve conferir a janela contra o relógio injetado', async () => {
      const { send, seed, clock } = makeSut();
      await seed();
      const old = offlineEvent(1, { ocorridoEm: at(-7 * DAY) });
      await send([old]);

      clock.advance(1);
      const error = await rejection(send([{ ...old, clientEventId: key(2) }]));

      expect(error.details?.map((d) => d.field)).toEqual(['events.0.ocorridoEm']);
    });

    it('deve rejeitar metodo QR no campo events.N.metodo', async () => {
      const { send, seed } = makeSut();
      await seed();

      const error = await rejection(send([offlineEvent(1, { metodo: 'QR' })]));

      expect(error.details?.map((d) => d.field)).toEqual(['events.0.metodo']);
    });

    it('deve rejeitar motivo diferente de TERMINAL_OFFLINE no campo events.N.motivo', async () => {
      const { send, seed } = makeSut();
      await seed();

      const error = await rejection(send([offlineEvent(1, { motivo: 'FORA_DO_PERIODO' })]));

      expect(error.details?.map((d) => d.field)).toEqual(['events.0.motivo']);
    });

    it('deve rejeitar UID inválido no campo events.N.uid', async () => {
      const { send, seed } = makeSut();
      await seed();

      const error = await rejection(send([offlineEvent(1, { uid: 'ZZZZZZZZ' })]));

      expect(error.details?.map((d) => d.field)).toEqual(['events.0.uid']);
    });

    it('deve listar no details todos os problemas de todos os eventos, na ordem do lote', async () => {
      const { send, seed, events } = makeSut();
      await seed();

      const error = await rejection(
        send([
          offlineEvent(1),
          offlineEvent(2, { resultado: 'AUTORIZADO' }),
          offlineEvent(3, { ocorridoEm: at(-8 * DAY), uid: 'não é hex' }),
          offlineEvent(4, { metodo: 'QR', motivo: 'TAG_INATIVA' }),
        ]),
      );

      expect(error.details?.map((d) => d.field)).toEqual([
        'events.1.resultado',
        'events.2.uid',
        'events.2.ocorridoEm',
        'events.3.metodo',
        'events.3.motivo',
      ]);
      expect(events.all()).toEqual([]);
    });
  });

  it.todo('deve propagar a falha de gravação sem contar nada como aceito');
  it.todo('deve recusar com 401 quando o terminal não existe mais');
  it.todo('deve não consumir uso nem alterar a autorização');
});
