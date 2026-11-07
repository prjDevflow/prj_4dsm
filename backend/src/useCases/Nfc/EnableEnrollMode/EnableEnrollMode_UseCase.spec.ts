import { describe, expect, it } from 'vitest';
import { isEnrollModeActive } from '../../../entities/rules/isEnrollModeActive';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { InMemoryTerminalRepository } from '../../../../test/doubles/InMemoryTerminalRepository';
import { InMemoryUserRepository } from '../../../../test/doubles/InMemoryUserRepository';
import { makeTerminal } from '../../../../test/factories/makeTerminal';
import { makeUser } from '../../../../test/factories/makeUser';
import { EnableEnrollModeUseCase } from './EnableEnrollMode_UseCase';

const makeSut = async (config = { enrollModeSeconds: 60 }) => {
  const terminals = new InMemoryTerminalRepository();
  const users = new InMemoryUserRepository();
  const clock = new FakeClock();
  const terminal = makeTerminal();
  const user = makeUser();
  await terminals.save(terminal);
  await users.save(user);
  const sut = new EnableEnrollModeUseCase(terminals, users, clock, config);
  return { sut, terminals, users, clock, terminal, user };
};

describe('EnableEnrollMode', () => {
  it('deve gravar o usuário e o prazo de agora mais 60 s e devolvê-los', async () => {
    const { sut, terminals, clock, terminal, user } = await makeSut();
    const expectedUntil = new Date(clock.now().getTime() + 60_000);

    const result = await sut.execute(terminal.id, { usuarioId: user.id });

    expect(result).toEqual({
      terminalId: terminal.id,
      usuarioId: user.id,
      expiraEm: expectedUntil,
    });
    expect(await terminals.findById(terminal.id)).toMatchObject({
      modoCadastroUsuarioId: user.id,
      modoCadastroAte: expectedUntil,
    });
  });

  it('deve usar o prazo configurado em ENROLL_MODE_SECONDS', async () => {
    const { sut, clock, terminal, user } = await makeSut({ enrollModeSeconds: 90 });

    const result = await sut.execute(terminal.id, { usuarioId: user.id });

    expect(result.expiraEm).toEqual(new Date(clock.now().getTime() + 90_000));
  });

  it('deve deixar o modo expirar sozinho: vigente em T+59 s e T+60 s, vencido em T+61 s', async () => {
    const { sut, terminals, clock, terminal, user } = await makeSut();
    await sut.execute(terminal.id, { usuarioId: user.id });
    const stored = await terminals.findById(terminal.id);
    const startedAt = clock.now();
    const at = (seconds: number) => new Date(startedAt.getTime() + seconds * 1000);

    expect(isEnrollModeActive(stored!, at(59))).toBe(true);
    expect(isEnrollModeActive(stored!, at(60))).toBe(true);
    expect(isEnrollModeActive(stored!, at(61))).toBe(false);
  });

  it('deve rejeitar terminal inexistente com 404', async () => {
    const { sut, user } = await makeSut();

    const error = await sut
      .execute('00000000-0000-4000-8000-0000000000ff', { usuarioId: user.id })
      .catch((e) => e);

    expect(error).toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
      message: 'Terminal não encontrado',
    });
  });

  it('deve rejeitar usuário inexistente com 404 e não gravar', async () => {
    const { sut, terminals, terminal } = await makeSut();

    const error = await sut
      .execute(terminal.id, { usuarioId: '00000000-0000-4000-8000-0000000000ff' })
      .catch((e) => e);

    expect(error).toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
      message: 'Usuário não encontrado',
    });
    expect(await terminals.findById(terminal.id)).toMatchObject({
      modoCadastroUsuarioId: null,
      modoCadastroAte: null,
    });
  });

  it('deve rejeitar usuário inativo com 422 no campo usuarioId e não gravar', async () => {
    const { sut, users, terminals, terminal } = await makeSut();
    const inactive = makeUser({ id: '00000000-0000-4000-8000-0000000000e3', ativo: false });
    await users.save(inactive);

    const error = await sut.execute(terminal.id, { usuarioId: inactive.id }).catch((e) => e);

    expect(error).toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 422,
      details: [{ field: 'usuarioId', message: 'Usuário inativo' }],
    });
    expect(await terminals.findById(terminal.id)).toMatchObject({ modoCadastroUsuarioId: null });
  });

  it('deve dar o 404 do terminal antes de olhar o usuário', async () => {
    const { sut } = await makeSut();

    const error = await sut
      .execute('00000000-0000-4000-8000-0000000000fe', {
        usuarioId: '00000000-0000-4000-8000-0000000000ff',
      })
      .catch((e) => e);

    expect(error).toMatchObject({ message: 'Terminal não encontrado' });
  });

  it('deve substituir o modo anterior quando é ativado de novo', async () => {
    const { sut, users, terminals, clock, terminal, user } = await makeSut();
    const other = makeUser({
      id: '00000000-0000-4000-8000-0000000000e2',
      email: 'outra@teste.local',
    });
    await users.save(other);
    await sut.execute(terminal.id, { usuarioId: user.id });
    clock.advance(30_000);

    const second = await sut.execute(terminal.id, { usuarioId: other.id });

    expect(await terminals.findById(terminal.id)).toMatchObject({
      modoCadastroUsuarioId: other.id,
      modoCadastroAte: second.expiraEm,
    });
    expect(second.expiraEm).toEqual(new Date(clock.now().getTime() + 60_000));
  });

  it('deve mudar só as duas colunas do modo de cadastro', async () => {
    const { sut, terminals, users } = await makeSut();
    const busy = makeTerminal({
      id: '00000000-0000-4000-8000-0000000000a2',
      accessPointId: '00000000-0000-4000-8000-0000000000c2',
      apiKeyHash: 'sha256:outra-chave',
      ultimoContatoEm: new Date('2026-10-20T13:59:50Z'),
      gpsFix: true,
      firmware: '0.3.0',
    });
    await terminals.save(busy);
    const [user] = (await users.list({ page: 1, pageSize: 10 })).items;

    await sut.execute(busy.id, { usuarioId: user!.id });

    expect(await terminals.findById(busy.id)).toEqual({
      ...busy,
      modoCadastroUsuarioId: user!.id,
      modoCadastroAte: new Date('2026-10-20T14:01:00Z'),
    });
  });

  it('deve responder 404 se o terminal some entre a leitura e a gravação', async () => {
    const { sut, terminals, terminal, user } = await makeSut();
    terminals.updateEnrollMode = async () => false;

    const error = await sut.execute(terminal.id, { usuarioId: user.id }).catch((e) => e);

    expect(error).toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('deve aceitar terminal inativo, que nem consegue ler tag', async () => {
    const { sut, terminals, users } = await makeSut();
    const off = makeTerminal({
      id: '00000000-0000-4000-8000-0000000000a3',
      accessPointId: '00000000-0000-4000-8000-0000000000c3',
      ativo: false,
    });
    await terminals.save(off);
    const [user] = (await users.list({ page: 1, pageSize: 10 })).items;

    const result = await sut.execute(off.id, { usuarioId: user!.id });

    expect(result.terminalId).toBe(off.id);
  });
});
