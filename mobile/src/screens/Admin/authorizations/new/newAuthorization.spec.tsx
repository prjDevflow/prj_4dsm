import { QueryClient } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { useSessionStore } from '@/context/SessionStore';
import { ApiError } from '@/service/ApiError';
import { FakeCreateAuthorizationService } from '@/service/fakes/FakeAuthorizationServices';
import { FakeLocationDirectory } from '@/service/fakes/FakeLocationDirectory';
import {
  FakeListAccessPointsService,
  FakeListBuildingsService,
} from '@/service/fakes/FakeLocationServices';
import { FakeUserDirectory } from '@/service/fakes/FakeUserDirectory';
import { FakeListUsersService } from '@/service/fakes/FakeUserServices';
import { sampleAdmin, sampleUsers } from '@/service/fakes/sampleData';
import { createWrapper } from '@test/renderWithProviders';
import { useNewAuthorizationModel } from './newAuthorization.model';
import { NewAuthorizationView } from './newAuthorization.view';

// 20/10/2026 at 10:00 on the phone: "today" for the defaults, the shortcuts and the rules.
const now = () => new Date(2026, 9, 20, 10, 0);

const renderForm = ({ users = new FakeUserDirectory() } = {}) => {
  const locations = new FakeLocationDirectory({ now });
  const services = {
    listUsersService: new FakeListUsersService(users),
    listBuildingsService: new FakeListBuildingsService(locations),
    listAccessPointsService: new FakeListAccessPointsService(locations),
    createAuthorizationService: new FakeCreateAuthorizationService({ users, locations, now }),
  };
  const navigation = { onClose: jest.fn(), onGoToUsers: jest.fn(), onGoToLocations: jest.fn() };
  const Screen = () => (
    <NewAuthorizationView
      {...useNewAuthorizationModel({ ...services, onClose: navigation.onClose, now })}
      onGoToUsers={navigation.onGoToUsers}
      onGoToLocations={navigation.onGoToLocations}
    />
  );
  return { ...services, navigation, rendered: render(<Screen />, { wrapper: createWrapper() }) };
};

const choose = async (field: string, option: string) => {
  await fireEvent.press(await screen.findByRole('button', { name: field }));
  await fireEvent.press(await screen.findByRole('radio', { name: option }));
};

const fillPersonAndPlace = async () => {
  await choose('Pessoa', 'Maria Souza, Condômino');
  await choose('Local de acesso', 'Catraca Social, Edifício Central');
};

const maria = sampleUsers.find((user) => user.nome === 'Maria Souza')!;

describe('Nova autorização (T24)', () => {
  beforeEach(() => useSessionStore.getState().signIn('fake-token-admin', sampleAdmin));

  it('abre com hoje nas duas datas, das 08:00 às 18:00, 1 utilização e sem campo de situação', async () => {
    const { rendered } = renderForm();
    await rendered;

    expect(await screen.findByRole('header', { name: 'Nova autorização' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Data inicial' })).toHaveAccessibilityValue({
      text: '20/10/2026',
    });
    expect(screen.getByRole('button', { name: 'Data final' })).toHaveAccessibilityValue({
      text: '20/10/2026',
    });
    expect(screen.getByRole('button', { name: 'Horário inicial' })).toHaveAccessibilityValue({
      text: '08:00',
    });
    expect(screen.getByRole('button', { name: 'Horário final' })).toHaveAccessibilityValue({
      text: '18:00',
    });
    expect(
      screen.getByRole('adjustable', { name: 'Número de utilizações (de 1 a 1.000)' }),
    ).toHaveAccessibilityValue({ now: 1 });
    expect(screen.queryByText(/Situação/)).toBeNull();
  });

  it('a pessoa só oferece usuários ativos, com nome e perfil', async () => {
    const { rendered } = renderForm();
    await rendered;

    await fireEvent.press(await screen.findByRole('button', { name: 'Pessoa' }));

    expect(await screen.findByRole('radio', { name: 'Maria Souza, Condômino' })).toBeOnTheScreen();
    // Eduarda Martins is inactive in the sample.
    expect(screen.queryByRole('radio', { name: /^Eduarda Martins/ })).toBeNull();
  });

  it('o local só oferece pontos ativos, agrupados por edifício', async () => {
    const { rendered } = renderForm();
    await rendered;

    await fireEvent.press(await screen.findByRole('button', { name: 'Local de acesso' }));

    expect(await screen.findByRole('header', { name: 'Edifício Central' })).toBeOnTheScreen();
    expect(
      screen.getByRole('radio', { name: 'Catraca Social, Edifício Central' }),
    ).toBeOnTheScreen();
    // "Catraca do Anexo" is inactive in the sample.
    expect(screen.queryByRole('radio', { name: /^Catraca do Anexo/ })).toBeNull();
  });

  it('"Criar autorização" sem pessoa e sem local marca os dois e não envia', async () => {
    const { createAuthorizationService, rendered } = renderForm();
    await rendered;

    await fireEvent.press(await screen.findByRole('button', { name: 'Criar autorização' }));

    expect(await screen.findByText('Escolha a pessoa.')).toBeOnTheScreen();
    expect(screen.getByText('Escolha o local.')).toBeOnTheScreen();
    expect(createAuthorizationService.calls).toHaveLength(0);
  });

  it('"Próximos 7 dias" e "Só hoje" preenchem as datas', async () => {
    const { rendered } = renderForm();
    await rendered;

    await fireEvent.press(await screen.findByRole('button', { name: 'Próximos 7 dias' }));
    expect(screen.getByRole('button', { name: 'Data final' })).toHaveAccessibilityValue({
      text: '26/10/2026',
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Só hoje' }));
    expect(screen.getByRole('button', { name: 'Data inicial' })).toHaveAccessibilityValue({
      text: '20/10/2026',
    });
    expect(screen.getByRole('button', { name: 'Data final' })).toHaveAccessibilityValue({
      text: '20/10/2026',
    });
  });

  it('o resumo aparece quando tudo está certo e acompanha cada mudança', async () => {
    const { rendered } = renderForm();
    await rendered;
    const summary = () => within(screen.getByTestId('authorization-summary'));

    expect(
      await screen.findByText('O resumo aparece quando todos os campos estiverem certos.'),
    ).toBeOnTheScreen();

    await fillPersonAndPlace();
    await fireEvent.press(screen.getByRole('button', { name: 'Próximos 7 dias' }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Aumentar Número de utilizações (de 1 a 1.000)' }),
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Aumentar Número de utilizações (de 1 a 1.000)' }),
    );

    expect(
      summary().getByText(
        'Maria Souza poderá entrar em Catraca Social (Edifício Central) de 20/10/2026 a 26/10/2026, das 08:00 às 18:00, até 3 vezes.',
      ),
    ).toBeOnTheScreen();
  });

  it('cria com os oito campos do contrato, mostra "Autorização criada." e fecha', async () => {
    const invalidate = jest.spyOn(QueryClient.prototype, 'invalidateQueries');
    const { createAuthorizationService, navigation, rendered } = renderForm();
    await rendered;

    await fillPersonAndPlace();
    await fireEvent.press(screen.getByRole('button', { name: 'Criar autorização' }));

    await waitFor(() => expect(navigation.onClose).toHaveBeenCalled());
    expect(createAuthorizationService.calls).toEqual([
      {
        usuarioId: maria.id,
        accessPointId: expect.any(String),
        dataInicio: '2026-10-20',
        dataFim: '2026-10-20',
        horaInicio: '08:00',
        horaFim: '18:00',
        usosPermitidos: 1,
      },
    ]);
    expect(createAuthorizationService.created[0].situacaoEfetiva).toBe('ATIVA');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['authorizations'] });
  });

  it('404 de pessoa ou local mostra a faixa pedindo para atualizar', async () => {
    const { createAuthorizationService, navigation, rendered } = renderForm();
    createAuthorizationService.exec = () =>
      Promise.reject(new ApiError(404, 'NOT_FOUND', 'Usuário não encontrado'));
    await rendered;

    await fillPersonAndPlace();
    await fireEvent.press(screen.getByRole('button', { name: 'Criar autorização' }));

    expect(
      await screen.findByText('A pessoa ou o local não existe mais. Atualize a tela.'),
    ).toBeOnTheScreen();
    expect(navigation.onClose).not.toHaveBeenCalled();
  });

  it('422 de campo aparece junto ao campo indicado', async () => {
    const { createAuthorizationService, rendered } = renderForm();
    createAuthorizationService.exec = () =>
      Promise.reject(
        new ApiError(422, 'VALIDATION_ERROR', 'Dados inválidos', [
          { field: 'accessPointId', message: 'o ponto de acesso está inativo' },
        ]),
      );
    await rendered;

    await fillPersonAndPlace();
    await fireEvent.press(screen.getByRole('button', { name: 'Criar autorização' }));

    expect(await screen.findByText('O ponto de acesso está inativo.')).toBeOnTheScreen();
  });

  it('sem pessoa ativa, explica e leva ao cadastro em vez de abrir a lista vazia', async () => {
    const onlyInactive = new FakeUserDirectory([{ ...maria, ativo: false }]);
    const { navigation, rendered } = renderForm({ users: onlyInactive });
    await rendered;

    expect(await screen.findByText('Nenhuma pessoa ativa cadastrada.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Cadastrar pessoa' }));

    expect(navigation.onGoToUsers).toHaveBeenCalled();
  });

  it('"Cancelar" com alterações pergunta antes de descartar', async () => {
    const { navigation, rendered } = renderForm();
    await rendered;

    await choose('Pessoa', 'Maria Souza, Condômino');
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Descartar' }));

    expect(navigation.onClose).toHaveBeenCalledTimes(1);
  });
});
