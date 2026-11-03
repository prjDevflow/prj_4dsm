import { describe, expect, it } from 'vitest';
import { AccessEvent } from './AccessEvent';

const base = {
  id: '00000000-0000-4000-8000-000000000001',
  ocorridoEm: new Date('2026-10-20T14:32:07Z'),
  metodo: 'QR' as const,
  terminalId: '00000000-0000-4000-8000-0000000000a9',
  accessPointId: '00000000-0000-4000-8000-0000000000b1',
  usuarioId: '00000000-0000-4000-8000-0000000000c1',
};

describe('AccessEvent.approved', () => {
  it('deve montar um evento AUTORIZADO com método, ids, distância e autorização, sem motivo', () => {
    const event = AccessEvent.approved({
      ...base,
      authorizationId: '00000000-0000-4000-8000-0000000000d1',
      distanciaM: 14.2,
    });

    expect(event).toEqual({
      ...base,
      authorizationId: '00000000-0000-4000-8000-0000000000d1',
      resultado: 'AUTORIZADO',
      motivo: null,
      distanciaM: 14.2,
      clientEventId: null,
      detalhes: null,
    });
  });
});

describe('AccessEvent.denied', () => {
  it('deve montar um evento NEGADO com o motivo, deixando distância e autorização nulas', () => {
    const event = AccessEvent.denied({ ...base, motivo: 'FORA_DO_PERIODO' });

    expect(event).toEqual({
      ...base,
      authorizationId: null,
      resultado: 'NEGADO',
      motivo: 'FORA_DO_PERIODO',
      distanciaM: null,
      clientEventId: null,
      detalhes: null,
    });
  });
});

describe('detalhes do evento', () => {
  it.todo('deve ignorar token, chave e senha que venham junto da entrada');
  it.todo('deve guardar só 8 caracteres do hash de uma credencial desconhecida, com terminal e ponto nulos');
  it.todo('deve deixar detalhes nulo quando não há precisão nem hash');
});
