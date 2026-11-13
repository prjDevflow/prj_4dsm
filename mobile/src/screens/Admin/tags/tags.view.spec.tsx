import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { FakeLocationDirectory } from '@/service/fakes/FakeLocationDirectory';
import { FakeListTerminalsService } from '@/service/fakes/FakeLocationServices';
import { FakeNfcTagDirectory } from '@/service/fakes/FakeNfcTagDirectory';
import {
  FakeCreateNfcTagService,
  FakeEnableEnrollModeService,
  FakeListNfcTagsService,
} from '@/service/fakes/FakeNfcTagServices';
import { FakeUserDirectory } from '@/service/fakes/FakeUserDirectory';
import { FakeListUsersService } from '@/service/fakes/FakeUserServices';
import { sampleUsers } from '@/service/fakes/sampleData';
import { createWrapper } from '@test/renderWithProviders';
import { TagDetailView } from './detail/tagDetail.view';
import { useTagEnrollModel } from './enroll/tagEnroll.model';
import { TagEnrollView } from './enroll/tagEnroll.view';
import { useTagFormModel } from './form/tagForm.model';
import { TagFormView } from './form/tagForm.view';
import { useTagsListModel } from './list/tagsList.model';
import { TagsListView } from './list/tagsList.view';

const [, condomino, visitante] = sampleUsers;
const users = () => new FakeListUsersService(new FakeUserDirectory());

describe('Tags NFC (T28)', () => {
  const renderList = async () => {
    const directory = new FakeNfcTagDirectory();
    directory.create({ usuarioId: condomino.id, uid: '04A1B2C3D4', descricao: 'Chaveiro azul' });
    const old = directory.create({ usuarioId: visitante.id, uid: '04B6A0E553' });
    directory.update(old.id, false);
    const navigation = { onBack: jest.fn(), onNew: jest.fn(), onOpen: jest.fn() };
    const services = {
      listNfcTagsService: new FakeListNfcTagsService(directory),
      listUsersService: users(),
    };
    const Screen = () => <TagsListView {...useTagsListModel(services)} {...navigation} />;
    await render(<Screen />, { wrapper: createWrapper() });
    return { navigation, old };
  };

  it('cada item lê o fim do código, a pessoa, a descrição e o selo', async () => {
    await renderList();

    expect(screen.getByRole('header', { name: 'Tags NFC' })).toBeOnTheScreen();
    expect(
      await screen.findByRole('button', {
        name: `Tag terminada em C3D4, ${condomino.nome}, Chaveiro azul, Ativa`,
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText('••••C3D4')).toBeOnTheScreen();
    expect(screen.queryByText('04A1B2C3D4')).toBeNull();
  });

  it('a tag desativada mostra "Inativa"', async () => {
    await renderList();

    expect(
      await screen.findByRole('button', {
        name: `Tag terminada em E553, ${visitante.nome}, Inativa`,
      }),
    ).toBeOnTheScreen();
  });

  it('"Vincular tag" e o toque num item levam às telas certas', async () => {
    const { navigation, old } = await renderList();

    await fireEvent.press(screen.getByRole('button', { name: 'Vincular tag' }));
    await fireEvent.press(await screen.findByRole('button', { name: /^Tag terminada em E553/ }));

    expect(navigation.onNew).toHaveBeenCalled();
    expect(navigation.onOpen).toHaveBeenCalledWith(old.id);
  });

  it('a busca por pessoa está na tela', async () => {
    await renderList();

    expect(await screen.findByRole('button', { name: 'Pessoa' })).toBeOnTheScreen();
  });
});

describe('Vincular tag (T29)', () => {
  const renderForm = async (directory = new FakeNfcTagDirectory()) => {
    const createNfcTagService = new FakeCreateNfcTagService(directory);
    const actions = { onClose: jest.fn(), onOpenEnroll: jest.fn() };
    const Screen = () => (
      <TagFormView
        {...useTagFormModel({ createNfcTagService, listUsersService: users(), ...actions })}
      />
    );
    await render(<Screen />, { wrapper: createWrapper() });
    return { createNfcTagService, actions };
  };

  const choosePerson = async () => {
    await fireEvent.press(screen.getByRole('button', { name: 'Pessoa' }));
    await fireEvent.press(
      await screen.findByRole('radio', { name: `${condomino.nome}, Condômino` }),
    );
  };

  it('mostra os campos, a ajuda do código e "Ler tag no terminal"', async () => {
    await renderForm();

    expect(screen.getByRole('header', { name: 'Vincular tag' })).toBeOnTheScreen();
    expect(screen.getByText('Exemplo: 04A1B2C3D4')).toBeOnTheScreen();
    expect(screen.getByLabelText('Código da tag (UID)')).toBeOnTheScreen();
    expect(screen.getByLabelText('Descrição (opcional)')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ler tag no terminal' })).toBeOnTheScreen();
  });

  it('salva 04:a1:b2:c3 como 04A1B2C3', async () => {
    const { createNfcTagService, actions } = await renderForm();
    await choosePerson();

    await fireEvent.changeText(screen.getByLabelText('Código da tag (UID)'), '04:a1:b2:c3');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(actions.onClose).toHaveBeenCalled());
    expect(createNfcTagService.calls).toEqual([{ usuarioId: condomino.id, uid: '04A1B2C3' }]);
  });

  it('a tag repetida mostra o erro no campo', async () => {
    const directory = new FakeNfcTagDirectory();
    directory.create({ usuarioId: visitante.id, uid: '04A1B2C3' });
    await renderForm(directory);
    await choosePerson();

    await fireEvent.changeText(screen.getByLabelText('Código da tag (UID)'), '04A1B2C3');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Esta tag já está vinculada a alguém.')).toBeOnTheScreen();
  });

  it('um código inválido mostra a regra', async () => {
    await renderForm();
    await choosePerson();

    await fireEvent.changeText(screen.getByLabelText('Código da tag (UID)'), '04A1');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByText('Código inválido. Use de 8 a 20 letras e números.'),
    ).toBeOnTheScreen();
  });
});

describe('Detalhe da tag', () => {
  const tag = {
    id: 'tag-1',
    usuarioId: condomino.id,
    uid: '04A1B2C3D4',
    descricao: 'Chaveiro azul',
    ativa: true,
    criadaEm: '2026-11-13T15:00:00Z',
  };

  const renderDetail = async (overrides: Partial<Parameters<typeof TagDetailView>[0]> = {}) => {
    const props = {
      tag,
      pessoa: condomino.nome,
      confirmVisible: false,
      isSaving: false,
      apiError: null,
      onToggleAtiva: jest.fn(),
      onConfirmDeactivate: jest.fn(),
      onCancelDeactivate: jest.fn(),
      onBack: jest.fn(),
      ...overrides,
    };
    await render(<TagDetailView {...props} />);
    return props;
  };

  it('mostra o código inteiro, a pessoa, a descrição e quando foi vinculada', async () => {
    await renderDetail();

    expect(screen.getByLabelText('Código: 04A1B2C3D4')).toBeOnTheScreen();
    expect(screen.getByLabelText(`Pessoa: ${condomino.nome}`)).toBeOnTheScreen();
    expect(screen.getByLabelText('Descrição: Chaveiro azul')).toBeOnTheScreen();
    expect(screen.getByLabelText('Vinculada em: 13/11/2026 às 12:00')).toBeOnTheScreen();
  });

  it('o interruptor "Tag ativa" pede para mudar', async () => {
    const { onToggleAtiva } = await renderDetail();

    await fireEvent(screen.getByRole('switch', { name: 'Tag ativa' }), 'valueChange', false);

    expect(onToggleAtiva).toHaveBeenCalledWith(false);
  });

  it('a confirmação explica o efeito e tem "Desativar" e "Voltar"', async () => {
    const { onConfirmDeactivate, onCancelDeactivate } = await renderDetail({
      confirmVisible: true,
    });

    expect(screen.getByText('Desativar esta tag?')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'A tag deixa de abrir a catraca na hora. Você pode ativá-la de novo depois.',
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Desativar' }));
    // The last "Voltar" is the dialog's; the first is the header's arrow.
    await fireEvent.press(screen.getAllByRole('button', { name: 'Voltar' }).at(-1)!);
    expect(onConfirmDeactivate).toHaveBeenCalled();
    expect(onCancelDeactivate).toHaveBeenCalled();
  });

  it('sem a tag carregada, mostra um aviso e o caminho de volta', async () => {
    const { onBack } = await renderDetail({ tag: null });

    expect(screen.getByText('Tag não encontrada.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar para a lista' }));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('Ler tag no terminal (T30)', () => {
  afterEach(() => jest.useRealTimers());

  it('escolher o terminal mostra "Aproxime a tag do terminal…" e a contagem', async () => {
    jest.useFakeTimers();
    const directory = new FakeNfcTagDirectory();
    const services = {
      enableEnrollModeService: new FakeEnableEnrollModeService(directory, null),
      listNfcTagsService: new FakeListNfcTagsService(directory),
      listTerminalsService: new FakeListTerminalsService(new FakeLocationDirectory()),
      listUsersService: users(),
    };
    const navigation = { onBack: jest.fn(), onDone: jest.fn() };
    const Screen = () => (
      <TagEnrollView
        {...useTagEnrollModel({ ...services, usuarioId: condomino.id })}
        {...navigation}
      />
    );
    await render(<Screen />, { wrapper: createWrapper() });
    await act(async () => jest.advanceTimersByTimeAsync(10));

    expect(screen.getByRole('header', { name: 'Ler tag no terminal' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Terminal' }));
    await fireEvent.press(await screen.findByRole('radio', { name: /^Terminal da Portaria/ }));
    await act(async () => jest.advanceTimersByTimeAsync(10));

    expect(screen.getByText('Aproxime a tag do terminal…')).toBeOnTheScreen();
    expect(screen.getByText('Faltam 60 s')).toBeOnTheScreen();

    directory.readOnTerminal(services.enableEnrollModeService.calls[0].terminalId, '0a0b0c0d');
    await act(async () => jest.advanceTimersByTimeAsync(2000));

    expect(screen.getByText(`Tag vinculada a ${condomino.nome}.`)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Concluir' }));
    expect(navigation.onDone).toHaveBeenCalled();
  });
});
