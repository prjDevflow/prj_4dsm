import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { ApiError } from '@/service/ApiError';
import { FakeAuthorizationDirectory } from '@/service/fakes/FakeAuthorizationDirectory';
import { FakeListMyAuthorizationsService } from '@/service/fakes/FakeAuthorizationServices';
import { FakeLocationDirectory } from '@/service/fakes/FakeLocationDirectory';
import { FakeUserDirectory } from '@/service/fakes/FakeUserDirectory';
import { sampleVisitante } from '@/service/fakes/sampleData';
import { useSessionStore } from '@/context/SessionStore';
import { createWrapper } from '@test/renderWithProviders';
import { useMyAuthorizationsModel } from './myAuthorizations.model';
import { MyAuthorizationsView } from './myAuthorizations.view';

// 13:00 UTC is 10:00 in São Paulo: inside "Catraca Social" and past the 09:00 of "Porta da Garagem".
const clock = () => new Date('2026-10-20T13:00:00.000Z');

// The view with its real model and the fake directory: what the page renders, without the router.
const renderScreen = async (prepare?: (service: FakeListMyAuthorizationsService) => void) => {
  await useSessionStore.getState().signIn('fake-token-visitante', sampleVisitante);
  const users = new FakeUserDirectory();
  const locations = new FakeLocationDirectory({ now: clock });
  const directory = new FakeAuthorizationDirectory({ users, locations, now: clock });
  const service = new FakeListMyAuthorizationsService(directory);
  prepare?.(service);
  const navigation = { onBack: jest.fn(), onOpenScanner: jest.fn() };
  const Screen = () => (
    <MyAuthorizationsView
      {...useMyAuthorizationsModel({ listMyAuthorizationsService: service, clock })}
      {...navigation}
    />
  );
  await render(<Screen />, { wrapper: createWrapper() });
  return { navigation, service };
};

const icons = () => screen.queryAllByTestId('status-pill-icon', { includeHiddenElements: true });

describe('Minhas autorizações (T04)', () => {
  it('o cartão mostra local, edifício, validade, horário, entradas e selo', async () => {
    await renderScreen();

    expect(await screen.findByRole('header', { name: 'Ativas' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Minhas autorizações' })).toBeOnTheScreen();
    const card = screen.getByTestId('authorization-card-Catraca Social');
    expect(within(card).getByText('Edifício Central')).toBeOnTheScreen();
    expect(within(card).getByText('Válida de 19/10 a 25/10')).toBeOnTheScreen();
    expect(within(card).getByText('Das 00:00 às 23:59')).toBeOnTheScreen();
    expect(within(card).getByText('Entradas')).toBeOnTheScreen();
    expect(within(card).getByText('Restam 2 de 3')).toBeOnTheScreen();
    expect(within(card).getByText('Ativa')).toBeOnTheScreen();
  });

  it('a barra mostra as entradas que restam, não as usadas', async () => {
    await renderScreen();

    const card = await screen.findByTestId('authorization-card-Catraca Social');

    expect(within(card).getByRole('progressbar', { name: 'Entradas restantes' })).toHaveProp(
      'accessibilityValue',
      { min: 0, max: 3, now: 2 },
    );
  });

  it('avisa só no cartão que está fora do horário agora', async () => {
    await renderScreen();

    const garage = await screen.findByTestId('authorization-card-Porta da Garagem');
    const social = screen.getByTestId('authorization-card-Catraca Social');

    expect(within(garage).getByText('Agora está fora do horário permitido.')).toBeOnTheScreen();
    expect(within(social).queryByText('Agora está fora do horário permitido.')).toBeNull();
  });

  it('"Anteriores" começa recolhida e abre com as três outras situações', async () => {
    await renderScreen();
    const toggle = await screen.findByRole('button', { name: 'Ver anteriores (3)' });
    expect(screen.queryByText('Cancelada')).toBeNull();

    await fireEvent.press(toggle);

    expect(screen.getByRole('button', { name: 'Ocultar anteriores (3)' })).toBeOnTheScreen();
    expect(screen.getByText('Cancelada')).toBeOnTheScreen();
    expect(screen.getByText('Expirada')).toBeOnTheScreen();
    expect(screen.getByText('Esgotada')).toBeOnTheScreen();
  });

  it('o estado de aberto chega ao leitor de tela', async () => {
    await renderScreen();
    const toggle = await screen.findByRole('button', { name: 'Ver anteriores (3)' });
    expect(toggle).toHaveAccessibilityState({ expanded: false });

    await fireEvent.press(toggle);

    expect(screen.getByRole('button', { name: 'Ocultar anteriores (3)' })).toHaveAccessibilityState(
      {
        expanded: true,
      },
    );
  });

  it('os quatro selos têm texto e ícone', async () => {
    await renderScreen();
    await fireEvent.press(await screen.findByRole('button', { name: 'Ver anteriores (3)' }));

    expect(screen.getAllByText('Ativa')).toHaveLength(2);
    expect(icons()).toHaveLength(5);
  });

  it('sem autorizações, explica o que fazer e mantém "Abrir catraca"', async () => {
    await renderScreen((service) => {
      service.exec = async ({ page, pageSize }) => ({ data: [], page, pageSize, total: 0 });
    });

    expect(await screen.findByText('Você ainda não tem autorizações.')).toBeOnTheScreen();
    expect(screen.getByText('Procure a administração.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Abrir catraca' })).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Ativas' })).toBeNull();
  });

  it('só com anteriores, diz que nenhuma está ativa', async () => {
    await renderScreen((service) => {
      const answer = service.exec.bind(service);
      service.exec = async (params) => {
        const result = await answer({ ...params, situacao: 'EXPIRADA' });
        return result;
      };
    });

    expect(await screen.findByText('Nenhuma autorização ativa agora.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ver anteriores (1)' })).toBeOnTheScreen();
  });

  it('falha ao carregar mostra "Tentar novamente"', async () => {
    await renderScreen((service) =>
      service.willFail(new ApiError(500, 'INTERNAL_ERROR', 'Erro interno')),
    );

    expect(
      await screen.findByText('Não foi possível carregar suas autorizações.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeOnTheScreen();
  });

  it('"Tentar novamente" recarrega a lista', async () => {
    const { service } = await renderScreen((fake) =>
      fake.willFail(new ApiError(500, 'INTERNAL_ERROR', 'Erro interno')),
    );
    const retry = await screen.findByRole('button', { name: 'Tentar novamente' });

    service.willFail(null);
    await fireEvent.press(retry);

    expect(await screen.findByRole('header', { name: 'Ativas' })).toBeOnTheScreen();
  });

  it('"Abrir catraca" e "Voltar" chamam a navegação', async () => {
    const { navigation } = await renderScreen();
    await screen.findByRole('header', { name: 'Ativas' });

    await fireEvent.press(screen.getByRole('button', { name: 'Abrir catraca' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

    expect(navigation.onOpenScanner).toHaveBeenCalledTimes(1);
    expect(navigation.onBack).toHaveBeenCalledTimes(1);
  });
});
