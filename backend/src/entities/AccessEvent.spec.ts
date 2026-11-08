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

const AUTHORIZATION_ID = '00000000-0000-4000-8000-0000000000d1';

describe('AccessEvent.approved', () => {
  // Checked by `npm run typecheck`: if the types get loose again, the directives below become unused errors.
  it('deve exigir terminal, ponto, usuário e autorização numa aprovação', () => {
    const full = { ...base, authorizationId: AUTHORIZATION_ID };

    // @ts-expect-error uma aprovação sempre tem a autorização que consumiu
    AccessEvent.approved({ ...full, authorizationId: null });
    // @ts-expect-error uma aprovação sempre vem de um terminal
    AccessEvent.approved({ ...full, terminalId: null });
    // @ts-expect-error uma aprovação sempre tem o ponto de acesso
    AccessEvent.approved({ ...full, accessPointId: null });
    // @ts-expect-error uma aprovação sempre tem o usuário
    AccessEvent.approved({ ...full, usuarioId: null });
  });

  it('não deve aceitar o hash de uma credencial desconhecida numa aprovação', () => {
    AccessEvent.approved({
      ...base,
      authorizationId: AUTHORIZATION_ID,
      // @ts-expect-error só a negação de uma credencial desconhecida guarda o hash
      credencialHash: 'abcdef01',
    });
  });

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
  it('deve ignorar token, chave e senha que venham junto da entrada', () => {
    // A variable, not a literal: the type check would reject extra fields in a literal.
    const input = {
      ...base,
      motivo: 'CREDENCIAL_INVALIDA' as const,
      precisaoMetros: 5,
      token: 'q3F8k2Zr1pLw9XbTn0YhVA',
      apiKey: 'chave-do-terminal',
      senha: 'Senha-Valida-123',
    };

    const event = AccessEvent.denied(input);

    expect(event.detalhes).toEqual({ precisaoMetros: 5 });
    expect(JSON.stringify(event)).not.toMatch(
      /q3F8k2Zr1pLw9XbTn0YhVA|chave-do-terminal|Senha-Valida/,
    );
  });
  it('deve guardar só 8 caracteres do hash de uma credencial desconhecida, com terminal e ponto nulos', () => {
    const hash = 'abcdef0123456789'.repeat(4);

    const event = AccessEvent.denied({
      ...base,
      terminalId: null,
      accessPointId: null,
      motivo: 'CREDENCIAL_INVALIDA',
      credencialHash: hash,
    });

    expect(event.terminalId).toBeNull();
    expect(event.accessPointId).toBeNull();
    expect(event.detalhes).toEqual({ credencialHashPrefixo: 'abcdef01' });
    expect(JSON.stringify(event)).not.toContain(hash);
  });

  it('deve guardar o hash inteiro quando ele tem menos de 8 caracteres', () => {
    const event = AccessEvent.denied({
      ...base,
      motivo: 'CREDENCIAL_INVALIDA',
      credencialHash: 'abc',
    });

    expect(event.detalhes).toEqual({ credencialHashPrefixo: 'abc' });
  });

  it('deve guardar a precisão do GPS do celular em detalhes', () => {
    const event = AccessEvent.approved({
      ...base,
      authorizationId: AUTHORIZATION_ID,
      precisaoMetros: 12.5,
    });

    expect(event.detalhes).toEqual({ precisaoMetros: 12.5 });
  });

  it('deve deixar detalhes nulo quando não há precisão nem hash', () => {
    expect(
      AccessEvent.approved({ ...base, authorizationId: AUTHORIZATION_ID }).detalhes,
    ).toBeNull();
    expect(AccessEvent.denied({ ...base, motivo: 'SEM_AUTORIZACAO' }).detalhes).toBeNull();
  });

  it('deve guardar o UID da tag em detalhes, inteiro, numa aprovação e numa negação', () => {
    const nfc = { ...base, metodo: 'NFC' as const, uid: '04A1B2C3D4' };

    expect(AccessEvent.approved({ ...nfc, authorizationId: AUTHORIZATION_ID }).detalhes).toEqual({
      uid: '04A1B2C3D4',
    });
    expect(AccessEvent.denied({ ...nfc, motivo: 'TAG_INATIVA' }).detalhes).toEqual({
      uid: '04A1B2C3D4',
    });
  });

  it('deve guardar o UID junto da precisão do GPS sem perder nenhum dos dois', () => {
    const event = AccessEvent.denied({
      ...base,
      motivo: 'TAG_DESCONHECIDA',
      precisaoMetros: 3,
      uid: '04A1B2C3',
    });

    expect(event.detalhes).toEqual({ precisaoMetros: 3, uid: '04A1B2C3' });
  });
});

describe('clientEventId do evento', () => {
  const KEY = '3f1c9a52-8e0b-4f55-9d57-2a6f0c1d7e44';

  it('deve guardar a chave de idempotência numa aprovação e numa negação', () => {
    const nfc = { ...base, metodo: 'NFC' as const, clientEventId: KEY };

    expect(
      AccessEvent.approved({ ...nfc, authorizationId: AUTHORIZATION_ID }).clientEventId,
    ).toBe(KEY);
    expect(AccessEvent.denied({ ...nfc, motivo: 'TAG_INATIVA' }).clientEventId).toBe(KEY);
  });

  it('deve deixar a chave nula quando o chamador não informa uma (o QR)', () => {
    expect(AccessEvent.denied({ ...base, motivo: 'SEM_AUTORIZACAO' }).clientEventId).toBeNull();
  });
});
