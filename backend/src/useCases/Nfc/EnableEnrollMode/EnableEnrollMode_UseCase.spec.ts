import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { InMemoryTerminalRepository } from '../../../../test/doubles/InMemoryTerminalRepository';
import { InMemoryUserRepository } from '../../../../test/doubles/InMemoryUserRepository';
import { makeTerminal } from '../../../../test/factories/makeTerminal';
import { makeUser } from '../../../../test/factories/makeUser';
import { isEnrollModeActive } from '../../../entities/rules/isEnrollModeActive';
import { EnableEnrollModeUseCase } from './EnableEnrollMode_UseCase';

const TERMINAL_ID = '00000000-0000-4000-8000-0000000000a9';
const USER_ID = '00000000-0000-4000-8000-0000000000e1';
const OTHER_USER_ID = '00000000-0000-4000-8000-0000000000e2';
const UNKNOWN_ID = '00000000-0000-4000-8000-0000000000ee';
const START = new Date('2026-11-06T12:00:00Z');
const after = (s: number) => new Date(START.getTime() + s * 1000);

const makeSut = async (enrollModeSeconds = 60) => {
  const terminals = new InMemoryTerminalRepository();
  await terminals.save(makeTerminal({ id: TERMINAL_ID }));
  const users = new InMemoryUserRepository();
  await users.save(makeUser({ id: USER_ID }));
  const clock = new FakeClock(START);
  const sut = new EnableEnrollModeUseCase(terminals, users, clock, { enrollModeSeconds });
  return { sut, terminals, users, clock };
};

describe('EnableEnrollMode', () => {
  it('deve gravar o usuário e o prazo de agora mais 60 s e devolver o prazo', async () => {
    const { sut, terminals } = await makeSut();

    const result = await sut.execute(TERMINAL_ID, { usuarioId: USER_ID });

    expect(result).toEqual({
      terminalId: TERMINAL_ID,
      usuarioId: USER_ID,
      modoCadastroAte: after(60),
    });
    expect(await terminals.findById(TERMINAL_ID)).toMatchObject({
      modoCadastroUsuarioId: USER_ID,
      modoCadastroAte: after(60),
    });
  });

  it('deve usar o prazo recebido na configuração', async () => {
    const { sut } = await makeSut(30);

    const result = await sut.execute(TERMINAL_ID, { usuarioId: USER_ID });

    expect(result.modoCadastroAte).toEqual(after(30));
  });

  it('deve expirar sozinho em T+61 s', async () => {
    const { sut, terminals, clock } = await makeSut();
    await sut.execute(TERMINAL_ID, { usuarioId: USER_ID });
    const terminal = (await terminals.findById(TERMINAL_ID))!;

    clock.set(after(60));
    expect(isEnrollModeActive(terminal, clock.now())).toBe(true);

    clock.set(after(61));
    expect(isEnrollModeActive(terminal, clock.now())).toBe(false);
  });

  it('deve substituir o modo vigente quando chamado de novo', async () => {
    const { sut, terminals, users, clock } = await makeSut();
    await users.save(makeUser({ id: OTHER_USER_ID, email: 'outra@teste.local' }));
    await sut.execute(TERMINAL_ID, { usuarioId: USER_ID });

    clock.set(after(10));
    await sut.execute(TERMINAL_ID, { usuarioId: OTHER_USER_ID });

    expect(await terminals.findById(TERMINAL_ID)).toMatchObject({
      modoCadastroUsuarioId: OTHER_USER_ID,
      modoCadastroAte: after(70),
    });
  });

  it('deve lançar 404 quando o terminal não existe', async () => {
    const { sut } = await makeSut();

    await expect(sut.execute(UNKNOWN_ID, { usuarioId: USER_ID })).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('deve lançar 404 quando o usuário não existe, sem abrir o modo', async () => {
    const { sut, terminals } = await makeSut();

    await expect(sut.execute(TERMINAL_ID, { usuarioId: UNKNOWN_ID })).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
    expect((await terminals.findById(TERMINAL_ID))?.modoCadastroUsuarioId).toBeNull();
  });

  it('deve lançar 422 no campo usuarioId quando o usuário está inativo, sem abrir o modo', async () => {
    const { sut, terminals, users } = await makeSut();
    await users.save(makeUser({ id: OTHER_USER_ID, email: 'outra@teste.local', ativo: false }));

    await expect(sut.execute(TERMINAL_ID, { usuarioId: OTHER_USER_ID })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 422,
      details: [{ field: 'usuarioId' }],
    });
    expect((await terminals.findById(TERMINAL_ID))?.modoCadastroUsuarioId).toBeNull();
  });

  it('deve lançar 422 no campo id quando o terminal está inativo, sem abrir o modo', async () => {
    const { sut, terminals } = await makeSut();
    await terminals.updateDetails(TERMINAL_ID, { ativo: false });

    await expect(sut.execute(TERMINAL_ID, { usuarioId: USER_ID })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 422,
      details: [{ field: 'id' }],
    });
    expect((await terminals.findById(TERMINAL_ID))?.modoCadastroUsuarioId).toBeNull();
  });

  it('deve trazer os dois campos quando o terminal e o usuário estão inativos', async () => {
    const { sut, terminals, users } = await makeSut();
    await terminals.updateDetails(TERMINAL_ID, { ativo: false });
    await users.save(makeUser({ id: OTHER_USER_ID, email: 'outra@teste.local', ativo: false }));

    await expect(sut.execute(TERMINAL_ID, { usuarioId: OTHER_USER_ID })).rejects.toMatchObject({
      status: 422,
      details: [{ field: 'id' }, { field: 'usuarioId' }],
    });
  });

  it('deve lançar 404 antes de 422 quando o terminal está inativo e o usuário não existe', async () => {
    const { sut, terminals } = await makeSut();
    await terminals.updateDetails(TERMINAL_ID, { ativo: false });

    await expect(sut.execute(TERMINAL_ID, { usuarioId: UNKNOWN_ID })).rejects.toMatchObject({
      status: 404,
      message: 'Usuário não encontrado',
    });
  });

  it('deve indicar o terminal quando o terminal e o usuário não existem', async () => {
    const { sut } = await makeSut();

    await expect(sut.execute(UNKNOWN_ID, { usuarioId: UNKNOWN_ID })).rejects.toMatchObject({
      status: 404,
      message: 'Terminal não encontrado',
    });
  });
});
