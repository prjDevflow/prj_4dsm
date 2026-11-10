import { describe, expect, it } from 'vitest';
import { InMemoryAccessEventRepository } from '../../test/doubles/InMemoryAccessEventRepository';
import { InMemoryAccessGrantRepository } from '../../test/doubles/InMemoryAccessGrantRepository';
import { makeLocationDoubles } from '../../test/doubles/InMemoryLocationUnitOfWork';
import { InMemoryQrCredentialRepository } from '../../test/doubles/InMemoryQrCredentialRepository';
import { InMemoryTerminalCommandRepository } from '../../test/doubles/InMemoryTerminalCommandRepository';
import { makeAuthorization } from '../../test/factories/makeAuthorization';
import { makeQrCredential } from '../../test/factories/makeQrCredential';
import { AccessEvent } from '../entities/AccessEvent';
import type { Authorization } from '../entities/Authorization';
import { TerminalCommand } from '../entities/TerminalCommand';
import type { CommitApprovalInput, CommitNfcApprovalInput } from './IAccessGrantRepository';

const NOW = new Date('2026-10-20T14:00:05Z');
const USER_ID = '00000000-0000-4000-8000-0000000000e1';
const TERMINAL_ID = '00000000-0000-4000-8000-0000000000a9';

const makeSut = () => {
  const credentials = new InMemoryQrCredentialRepository();
  const { authorizations } = makeLocationDoubles();
  const events = new InMemoryAccessEventRepository();
  const commands = new InMemoryTerminalCommandRepository();
  const sut = new InMemoryAccessGrantRepository(credentials, authorizations, events, commands);
  return { sut, credentials, authorizations, events, commands };
};

const makeInput = (overrides: Partial<CommitApprovalInput> = {}): CommitApprovalInput => ({
  credentialId: makeQrCredential().id,
  userId: USER_ID,
  authorizationId: makeAuthorization().id,
  now: NOW,
  event: AccessEvent.approved({
    id: '00000000-0000-4000-8000-000000000001',
    ocorridoEm: NOW,
    metodo: 'QR',
    terminalId: TERMINAL_ID,
    accessPointId: makeAuthorization().accessPointId,
    usuarioId: USER_ID,
    authorizationId: makeAuthorization().id,
  }),
  command: TerminalCommand.open({
    terminalId: TERMINAL_ID,
    now: NOW,
    ttlSeconds: 10,
    aberturaMs: 5000,
  }),
  ...overrides,
});

/** Credential unused and authorization with `usosRealizados` of `usosPermitidos` (3) already spent. */
const seed = (
  world: ReturnType<typeof makeSut>,
  { spent = 0, situacao = 'ATIVA' as Authorization['situacao'] } = {},
) => {
  world.credentials.seed(makeQrCredential());
  world.authorizations.add(makeAuthorization({ usosRealizados: spent, situacao }));
};

describe('InMemoryAccessGrantRepository.commitApproval', () => {
  it('deve consumir a credencial e um uso, gravar o evento e o comando e devolver os usos restantes', async () => {
    const world = makeSut();
    seed(world);

    const result = await world.sut.commitApproval(makeInput());

    expect(result).toEqual({ ok: true, usosRestantes: 2 });
    expect(world.credentials.all()[0]).toMatchObject({ consumidoEm: NOW, consumidoPorId: USER_ID });
    expect(world.authorizations.all()[0]?.usosRealizados).toBe(1);
    expect(world.events.all()).toHaveLength(1);
    expect(world.commands.all()).toHaveLength(1);
    expect(world.commands.all()[0]?.tipo).toBe('ABRIR');
  });

  it('deve devolver zero usos restantes ao consumir o último uso', async () => {
    const world = makeSut();
    seed(world, { spent: 2 });

    const result = await world.sut.commitApproval(makeInput());

    expect(result).toEqual({ ok: true, usosRestantes: 0 });
  });

  it('deve negar com CREDENCIAL_REUTILIZADA e não tocar em nada quando a credencial já foi consumida', async () => {
    const world = makeSut();
    world.credentials.seed(makeQrCredential({ consumidoEm: NOW, consumidoPorId: 'outro' }));
    world.authorizations.add(makeAuthorization());

    const result = await world.sut.commitApproval(makeInput());

    expect(result).toEqual({ ok: false, reason: 'CREDENCIAL_REUTILIZADA' });
    expect(world.authorizations.all()[0]?.usosRealizados).toBe(0);
    expect(world.credentials.all()[0]?.consumidoPorId).toBe('outro');
    expect(world.events.all()).toHaveLength(0);
    expect(world.commands.all()).toHaveLength(0);
  });

  it('deve negar com USOS_ESGOTADOS sem marcar a credencial quando os usos acabaram', async () => {
    const world = makeSut();
    seed(world, { spent: 3 });

    const result = await world.sut.commitApproval(makeInput());

    expect(result).toEqual({ ok: false, reason: 'USOS_ESGOTADOS' });
    expect(world.credentials.all()[0]?.consumidoEm).toBeNull();
    expect(world.authorizations.all()[0]?.usosRealizados).toBe(3);
    expect(world.events.all()).toHaveLength(0);
    expect(world.commands.all()).toHaveLength(0);
  });

  it('deve negar com USOS_ESGOTADOS quando a autorização foi cancelada antes do commit', async () => {
    const world = makeSut();
    seed(world, { situacao: 'CANCELADA' });

    const result = await world.sut.commitApproval(makeInput());

    expect(result).toEqual({ ok: false, reason: 'USOS_ESGOTADOS' });
    expect(world.credentials.all()[0]?.consumidoEm).toBeNull();
  });

  it('deve desfazer tudo quando a gravação do evento falha (a aprovação nunca vale sem o evento)', async () => {
    const world = makeSut();
    seed(world);
    world.events.failWith(new Error('banco indisponível'));

    await expect(world.sut.commitApproval(makeInput())).rejects.toThrow('banco indisponível');

    expect(world.credentials.all()[0]?.consumidoEm).toBeNull();
    expect(world.credentials.all()[0]?.consumidoPorId).toBeNull();
    expect(world.authorizations.all()[0]?.usosRealizados).toBe(0);
    expect(world.events.all()).toHaveLength(0);
    expect(world.commands.all()).toHaveLength(0);
  });

  it('deve desfazer tudo, evento incluído, quando a gravação do comando falha', async () => {
    const world = makeSut();
    seed(world);
    world.commands.failWith(new Error('banco indisponível'));

    await expect(world.sut.commitApproval(makeInput())).rejects.toThrow('banco indisponível');

    expect(world.credentials.all()[0]?.consumidoEm).toBeNull();
    expect(world.authorizations.all()[0]?.usosRealizados).toBe(0);
    expect(world.events.all()).toHaveLength(0);
  });
});

const KEY = '3f1c9a52-8e0b-4f55-9d57-2a6f0c1d7e44';

const makeNfcInput = (
  overrides: { eventId?: string; clientEventId?: string } = {},
): CommitNfcApprovalInput => ({
  authorizationId: makeAuthorization().id,
  event: AccessEvent.approved({
    id: overrides.eventId ?? '00000000-0000-4000-8000-000000000002',
    ocorridoEm: NOW,
    metodo: 'NFC',
    terminalId: TERMINAL_ID,
    accessPointId: makeAuthorization().accessPointId,
    usuarioId: USER_ID,
    authorizationId: makeAuthorization().id,
    clientEventId: overrides.clientEventId ?? KEY,
    uid: '04A1B2C3',
  }),
});

const seedAuthorization = (
  world: ReturnType<typeof makeSut>,
  { spent = 0, situacao = 'ATIVA' as Authorization['situacao'] } = {},
) => world.authorizations.add(makeAuthorization({ usosRealizados: spent, situacao }));

describe('InMemoryAccessGrantRepository.commitNfcApproval', () => {
  it('deve consumir um uso, gravar o evento com a chave e devolver os usos restantes, sem comando', async () => {
    const world = makeSut();
    seedAuthorization(world);

    const result = await world.sut.commitNfcApproval(makeNfcInput());

    expect(result).toEqual({ ok: true, usosRestantes: 2 });
    expect(world.authorizations.all()[0]?.usosRealizados).toBe(1);
    expect(world.events.all()).toHaveLength(1);
    expect(world.events.all()[0]).toMatchObject({ metodo: 'NFC', clientEventId: KEY });
    expect(world.commands.all()).toHaveLength(0);
  });

  it('deve devolver zero usos restantes ao consumir o último uso', async () => {
    const world = makeSut();
    seedAuthorization(world, { spent: 2 });

    expect(await world.sut.commitNfcApproval(makeNfcInput())).toEqual({
      ok: true,
      usosRestantes: 0,
    });
  });

  it('deve negar com USOS_ESGOTADOS e não deixar o evento quando os usos acabaram', async () => {
    const world = makeSut();
    seedAuthorization(world, { spent: 3 });

    const result = await world.sut.commitNfcApproval(makeNfcInput());

    expect(result).toEqual({ ok: false, reason: 'USOS_ESGOTADOS' });
    expect(world.authorizations.all()[0]?.usosRealizados).toBe(3);
    expect(world.events.all()).toHaveLength(0);
  });

  it('deve negar com USOS_ESGOTADOS quando a autorização foi cancelada antes do commit', async () => {
    const world = makeSut();
    seedAuthorization(world, { situacao: 'CANCELADA' });

    const result = await world.sut.commitNfcApproval(makeNfcInput());

    expect(result).toEqual({ ok: false, reason: 'USOS_ESGOTADOS' });
    expect(world.events.all()).toHaveLength(0);
  });

  it('deve negar com CHAVE_REPETIDA sem consumir outro uso quando a chave já tem evento', async () => {
    const world = makeSut();
    seedAuthorization(world);
    await world.sut.commitNfcApproval(makeNfcInput());

    const again = await world.sut.commitNfcApproval(
      makeNfcInput({ eventId: '00000000-0000-4000-8000-000000000003' }),
    );

    expect(again).toEqual({ ok: false, reason: 'CHAVE_REPETIDA' });
    expect(world.authorizations.all()[0]?.usosRealizados).toBe(1);
    expect(world.events.all()).toHaveLength(1);
  });

  it('deve preferir CHAVE_REPETIDA a USOS_ESGOTADOS: a chave é conferida antes de tocar nos usos', async () => {
    const world = makeSut();
    seedAuthorization(world, { spent: 3 });
    await world.events.append(makeNfcInput().event);

    const result = await world.sut.commitNfcApproval(
      makeNfcInput({ eventId: '00000000-0000-4000-8000-000000000003' }),
    );

    expect(result).toEqual({ ok: false, reason: 'CHAVE_REPETIDA' });
  });

  it('deve desfazer o uso quando a gravação do evento falha (a aprovação nunca vale sem o evento)', async () => {
    const world = makeSut();
    seedAuthorization(world);
    world.events.failWith(new Error('banco indisponível'));

    await expect(world.sut.commitNfcApproval(makeNfcInput())).rejects.toThrow('banco indisponível');

    expect(world.authorizations.all()[0]?.usosRealizados).toBe(0);
    expect(world.events.all()).toHaveLength(0);
  });

  it('deve aceitar a mesma aprovação duas vezes com chaves diferentes, um uso cada', async () => {
    const world = makeSut();
    seedAuthorization(world);

    await world.sut.commitNfcApproval(makeNfcInput());
    const second = await world.sut.commitNfcApproval(
      makeNfcInput({
        eventId: '00000000-0000-4000-8000-000000000003',
        clientEventId: '7d2e4b10-1c3a-4e9f-8a66-0b5c9d1e2f33',
      }),
    );

    expect(second).toEqual({ ok: true, usosRestantes: 1 });
    expect(world.events.all()).toHaveLength(2);
  });
});

describe('InMemoryAccessEventRepository (o que os use cases do NFC esperam dele)', () => {
  it('deve recusar um clientEventId repetido, como o índice único do banco', async () => {
    const { events } = makeSut();
    await events.append(makeNfcInput().event);

    await expect(
      events.append(makeNfcInput({ eventId: '00000000-0000-4000-8000-000000000003' }).event),
    ).rejects.toThrow();
    expect(events.all()).toHaveLength(1);
  });
});
