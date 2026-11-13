import { act, renderHook } from '@testing-library/react-native';
import { ApiError } from '@/service/ApiError';
import { FakeLocationDirectory } from '@/service/fakes/FakeLocationDirectory';
import { FakeListTerminalsService } from '@/service/fakes/FakeLocationServices';
import { FakeNfcTagDirectory } from '@/service/fakes/FakeNfcTagDirectory';
import {
  FakeEnableEnrollModeService,
  FakeListNfcTagsService,
} from '@/service/fakes/FakeNfcTagServices';
import { FakeUserDirectory } from '@/service/fakes/FakeUserDirectory';
import { FakeListUsersService } from '@/service/fakes/FakeUserServices';
import { sampleUsers } from '@/service/fakes/sampleData';
import { createWrapper } from '@test/renderWithProviders';
import { useTagEnrollModel } from './tagEnroll.model';

const [, condomino] = sampleUsers;

const setup = async () => {
  jest.useFakeTimers();
  const directory = new FakeNfcTagDirectory();
  const services = {
    enableEnrollModeService: new FakeEnableEnrollModeService(directory, null),
    listNfcTagsService: new FakeListNfcTagsService(directory),
    listTerminalsService: new FakeListTerminalsService(new FakeLocationDirectory()),
    listUsersService: new FakeListUsersService(new FakeUserDirectory()),
  };
  const hook = await renderHook(() => useTagEnrollModel({ ...services, usuarioId: condomino.id }), {
    wrapper: createWrapper(),
  });
  await act(async () => jest.advanceTimersByTimeAsync(10));
  return { ...services, directory, result: hook.result };
};

const seconds = (value: number) => act(async () => jest.advanceTimersByTimeAsync(value * 1000));

describe('useTagEnrollModel (T30)', () => {
  afterEach(() => jest.useRealTimers());

  it('começa escolhendo o terminal, sem ligar nada', async () => {
    const { result, enableEnrollModeService } = await setup();

    expect(result.current.stage).toBe('choosing');
    expect(result.current.terminalOptions.length).toBeGreaterThan(0);
    expect(enableEnrollModeService.calls).toEqual([]);
  });

  it('escolher o terminal liga o modo de cadastro para a pessoa e conta 60 s', async () => {
    const { result, enableEnrollModeService } = await setup();
    const terminalId = result.current.terminalOptions[0].value;

    await act(async () => result.current.onChooseTerminal(terminalId));
    await seconds(0.01);

    expect(enableEnrollModeService.calls).toEqual([{ terminalId, usuarioId: condomino.id }]);
    expect(result.current.stage).toBe('waiting');
    expect(result.current.remaining).toBe(60);

    await seconds(12);
    expect(result.current.remaining).toBe(48);
  });

  it('quando o terminal lê a tag, mostra a quem ela foi vinculada', async () => {
    const { result, directory } = await setup();
    const terminalId = result.current.terminalOptions[0].value;
    await act(async () => result.current.onChooseTerminal(terminalId));
    await seconds(0.01);

    directory.readOnTerminal(terminalId, '0a0b0c0d');
    await seconds(3);

    expect(result.current.stage).toBe('linked');
    expect(result.current.message).toBe(`Tag vinculada a ${condomino.nome}.`);
  });

  it('em 60 s sem tag, volta com tempo esgotado e para de consultar', async () => {
    const { result, listNfcTagsService } = await setup();
    await act(async () => result.current.onChooseTerminal(result.current.terminalOptions[0].value));
    await seconds(0.01);

    await seconds(60);

    expect(result.current.stage).toBe('expired');
    expect(result.current.message).toBe('Tempo esgotado. Nenhuma tag foi lida.');
    const calls = listNfcTagsService.calls.length;
    await seconds(10);
    expect(listNfcTagsService.calls.length).toBe(calls);
  });

  it('"Tentar de novo" liga o modo outra vez', async () => {
    const { result, enableEnrollModeService } = await setup();
    await act(async () => result.current.onChooseTerminal(result.current.terminalOptions[0].value));
    await seconds(60.5);

    await act(async () => result.current.onTryAgain());
    await seconds(0.01);

    expect(enableEnrollModeService.calls).toHaveLength(2);
    expect(result.current.stage).toBe('waiting');
    expect(result.current.remaining).toBe(60);
  });

  it('se o servidor recusar, mostra o motivo e deixa escolher de novo', async () => {
    const { result, enableEnrollModeService } = await setup();
    enableEnrollModeService.exec = jest
      .fn()
      .mockRejectedValue(new ApiError(null, 'NETWORK', 'Sem conexão'));

    await act(async () => result.current.onChooseTerminal(result.current.terminalOptions[0].value));
    await seconds(0.01);

    expect(result.current.stage).toBe('choosing');
    expect(result.current.errorMessage).not.toBe('');
  });
});
