import { act, renderHook, waitFor } from '@testing-library/react-native';
import { FakeNfcTagDirectory } from '@/service/fakes/FakeNfcTagDirectory';
import { FakeCreateNfcTagService } from '@/service/fakes/FakeNfcTagServices';
import { FakeUserDirectory } from '@/service/fakes/FakeUserDirectory';
import { FakeListUsersService } from '@/service/fakes/FakeUserServices';
import { sampleUsers } from '@/service/fakes/sampleData';
import { createWrapper } from '@test/renderWithProviders';
import { useTagFormModel } from './tagForm.model';

const [, condomino, visitante] = sampleUsers;

const setup = (directory = new FakeNfcTagDirectory()) => {
  const createNfcTagService = new FakeCreateNfcTagService(directory);
  const onClose = jest.fn();
  const onOpenEnroll = jest.fn();
  const hook = renderHook(
    () =>
      useTagFormModel({
        createNfcTagService,
        listUsersService: new FakeListUsersService(new FakeUserDirectory()),
        onClose,
        onOpenEnroll,
      }),
    { wrapper: createWrapper() },
  );
  return { createNfcTagService, onClose, onOpenEnroll, hook };
};

const fill = async (
  result: { current: ReturnType<typeof useTagFormModel> },
  values: { usuarioId?: string; uid?: string; descricao?: string },
) =>
  act(async () => {
    for (const [name, value] of Object.entries(values)) {
      result.current.form.setValue(name as 'uid', value, { shouldDirty: true });
    }
  });

describe('useTagFormModel (T29)', () => {
  it('envia o código já normalizado: 04:a1:b2:c3 vira 04A1B2C3', async () => {
    const { hook, createNfcTagService, onClose } = setup();
    const { result } = await hook;
    await fill(result, {
      usuarioId: condomino.id,
      uid: '04:a1:b2:c3',
      descricao: '  Chaveiro azul ',
    });

    await act(() => result.current.onSubmit());

    expect(createNfcTagService.calls).toEqual([
      { usuarioId: condomino.id, uid: '04A1B2C3', descricao: 'Chaveiro azul' },
    ]);
    expect(onClose).toHaveBeenCalled();
  });

  it('sem descrição, não manda o campo', async () => {
    const { hook, createNfcTagService } = setup();
    const { result } = await hook;
    await fill(result, { usuarioId: condomino.id, uid: '04A1B2C3', descricao: '  ' });

    await act(() => result.current.onSubmit());

    expect(createNfcTagService.calls).toEqual([{ usuarioId: condomino.id, uid: '04A1B2C3' }]);
  });

  it.each(['04A1B2C', '04A1B2G3', '04A1B2C3D4E5F6A7B8C9D'])(
    'código inválido (%s) mostra a mensagem e não envia',
    async (uid) => {
      const { hook, createNfcTagService } = setup();
      const { result } = await hook;
      await fill(result, { usuarioId: condomino.id, uid });

      await act(() => result.current.onSubmit());

      expect(result.current.form.formState.errors.uid?.message).toBe(
        'Código inválido. Use de 8 a 20 letras e números.',
      );
      expect(createNfcTagService.calls).toEqual([]);
    },
  );

  it('sem pessoa, pede para escolher', async () => {
    const { hook, createNfcTagService } = setup();
    const { result } = await hook;
    await fill(result, { uid: '04A1B2C3' });

    await act(() => result.current.onSubmit());

    expect(result.current.form.formState.errors.usuarioId?.message).toBe('Escolha a pessoa.');
    expect(createNfcTagService.calls).toEqual([]);
  });

  it('tag repetida mostra o erro no campo do código', async () => {
    const directory = new FakeNfcTagDirectory();
    directory.create({ usuarioId: visitante.id, uid: '04A1B2C3' });
    const { hook, onClose } = setup(directory);
    const { result } = await hook;
    await fill(result, { usuarioId: condomino.id, uid: '04-a1-b2-c3' });

    await act(() => result.current.onSubmit());

    await waitFor(() =>
      expect(result.current.form.formState.errors.uid?.message).toBe(
        'Esta tag já está vinculada a alguém.',
      ),
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('só oferece pessoas ativas', async () => {
    const { hook } = setup();
    const { result } = await hook;

    await waitFor(() => expect(result.current.personOptions.length).toBeGreaterThan(0));
    const inactive = sampleUsers.filter((user) => !user.ativo).map((user) => user.id);
    expect(result.current.personOptions.some((option) => inactive.includes(option.value))).toBe(
      false,
    );
  });

  it('"Ler tag no terminal" sem pessoa pede para escolher antes', async () => {
    const { hook, onOpenEnroll } = setup();
    const { result } = await hook;

    await act(async () => result.current.onReadOnTerminal());

    expect(result.current.form.formState.errors.usuarioId?.message).toBe(
      'Escolha a pessoa antes de ler a tag no terminal.',
    );
    expect(onOpenEnroll).not.toHaveBeenCalled();
  });

  it('"Ler tag no terminal" com a pessoa abre a leitura para ela', async () => {
    const { hook, onOpenEnroll } = setup();
    const { result } = await hook;
    await fill(result, { usuarioId: condomino.id });

    await act(async () => result.current.onReadOnTerminal());

    expect(onOpenEnroll).toHaveBeenCalledWith(condomino.id);
  });
});
