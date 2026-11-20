import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { useSessionStore } from '@/context/SessionStore';
import { formatDateTime } from '@/lib/dateValue';
import type { Autorizacao } from '@/lib/types/authorizations';
import type { Page } from '@/lib/types/page';
import { ApiError } from '@/service/ApiError';
import { FakeAuthorizationDirectory } from '@/service/fakes/FakeAuthorizationDirectory';
import {
  FakeCancelAuthorizationService,
  FakeGetAuthorizationService,
} from '@/service/fakes/FakeAuthorizationServices';
import { FakeLocationDirectory } from '@/service/fakes/FakeLocationDirectory';
import { FakeUserDirectory } from '@/service/fakes/FakeUserDirectory';
import { sampleAdmin } from '@/service/fakes/sampleData';
import { createTestQueryClient } from '@test/renderWithProviders';
import { authorizationsQueryKeys } from '../authorizationsQueries';
import { useAuthorizationDetailModel } from './authorizationDetail.model';
import { AuthorizationDetailView } from './authorizationDetail.view';

const now = () => new Date(2026, 9, 20, 10, 0);
const listKey = authorizationsQueryKeys.list({});

// The view with its real model and fake services, and a list already in the cache.
const renderDetail = (pick: (authorization: Autorizacao) => boolean, id?: string) => {
  const users = new FakeUserDirectory();
  const locations = new FakeLocationDirectory({ now });
  const authorizations = new FakeAuthorizationDirectory({ users, locations, now });
  const list = authorizations.list({ page: 1, pageSize: 100 });
  const authorization = list.data.find(pick)!;
  const services = {
    getAuthorizationService: new FakeGetAuthorizationService(authorizations),
    cancelAuthorizationService: new FakeCancelAuthorizationService(authorizations),
  };
  const onBack = jest.fn();
  const queryClient: QueryClient = createTestQueryClient();
  queryClient.setQueryData<InfiniteData<Page<Autorizacao>>>(listKey, {
    pages: [list],
    pageParams: [1],
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const authorizationId = id ?? authorization.id;
  const Screen = () => (
    <AuthorizationDetailView
      {...useAuthorizationDetailModel({ authorizationId, ...services })}
      onBack={onBack}
    />
  );
  return {
    ...services,
    authorizations,
    authorization,
    authorizationId,
    onBack,
    queryClient,
    rendered: render(<Screen />, { wrapper }),
  };
};

const ofPerson = (nome: string) => (authorization: Autorizacao) =>
  authorization.usuario.nome === nome;

const ana = ofPerson('Ana Lima');

const openDialog = async () => {
  await fireEvent.press(await screen.findByRole('button', { name: 'Cancelar autorização' }));
  expect(screen.getByRole('header', { name: 'Cancelar esta autorização?' })).toBeOnTheScreen();
};

const confirm = async () => {
  const buttons = screen.getAllByRole('button', { name: 'Cancelar autorização' });
  await fireEvent.press(buttons[buttons.length - 1]);
};

describe('Detalhe da autorização (T25)', () => {
  beforeEach(() => useSessionStore.getState().signIn('fake-token-admin', sampleAdmin));

  it('mostra pessoa, perfil, local, edifício, período, horário, entradas e situação', async () => {
    const { rendered } = renderDetail(ana);
    await rendered;

    expect(await screen.findByText('Ana Lima')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Autorização' })).toBeOnTheScreen();
    expect(screen.getByText('Condômino')).toBeOnTheScreen();
    expect(screen.getByText('Porta da Garagem, Edifício Central')).toBeOnTheScreen();
    expect(screen.getByText('01/10/2026 a 29/12/2026')).toBeOnTheScreen();
    expect(screen.getByText('Das 06:00 às 09:00')).toBeOnTheScreen();
    expect(screen.getByText('22 de 60 usadas')).toBeOnTheScreen();
    expect(screen.getByText('Restam 38 entradas.')).toBeOnTheScreen();
    expect(screen.getByText('Ativa')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar', { name: 'Entradas usadas' })).toBeOnTheScreen();
  });

  it('mostra quem criou, e quando', async () => {
    const { authorization, rendered } = renderDetail(ana);
    await rendered;

    expect(
      await screen.findByText(
        `Criada por Administrador (dev) em ${formatDateTime(authorization.criadoEm)}`,
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/^Cancelada por/)).toBeNull();
  });

  it('cancelada mostra quem cancelou, quando e o motivo, e não tem o botão', async () => {
    const { authorization, rendered } = renderDetail(ofPerson('Bruno Alves'));
    await rendered;

    expect(
      await screen.findByText(
        `Cancelada por Administrador (dev) em ${formatDateTime(authorization.canceladoEm!)}`,
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Motivo: Pedido do morador')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Cancelar autorização' })).toBeNull();
  });

  it.each([
    ['ATIVA', 'Ativa', true],
    ['CANCELADA', 'Cancelada', false],
    ['ESGOTADA', 'Esgotada', false],
    ['EXPIRADA', 'Expirada', false],
  ])(
    'com a situação %s (%s), o botão de cancelar aparece: %s',
    async (situacao, badge, visible) => {
      const { rendered } = renderDetail((a) => a.situacaoEfetiva === situacao);
      await rendered;

      await screen.findByText(badge);

      expect(screen.queryByRole('button', { name: 'Cancelar autorização' }) !== null).toBe(visible);
    },
  );

  it('a confirmação aparece antes de cancelar; "Voltar" não cancela nada', async () => {
    const { cancelAuthorizationService, rendered } = renderDetail(ana);
    await rendered;

    await openDialog();

    expect(
      screen.getByText('A pessoa não poderá mais entrar com ela. Esta ação não pode ser desfeita.'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Motivo (opcional)')).toBeOnTheScreen();
    const back = screen.getAllByRole('button', { name: 'Voltar' });
    await fireEvent.press(back[back.length - 1]);

    expect(screen.queryByRole('header', { name: 'Cancelar esta autorização?' })).toBeNull();
    expect(cancelAuthorizationService.calls).toHaveLength(0);
  });

  it('confirmando com motivo, envia, e a tela muda para "Cancelada" sem reabrir', async () => {
    const { cancelAuthorizationService, authorizationId, rendered } = renderDetail(ana);
    await rendered;

    await openDialog();
    await fireEvent.changeText(screen.getByLabelText('Motivo (opcional)'), ' Pedido da moradora ');
    await confirm();

    expect(await screen.findByText('Cancelada')).toBeOnTheScreen();
    expect(cancelAuthorizationService.calls).toEqual([
      { id: authorizationId, motivo: 'Pedido da moradora' },
    ]);
    expect(screen.getByText('Motivo: Pedido da moradora')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Cancelar autorização' })).toBeNull();
    expect(screen.queryByRole('header', { name: 'Cancelar esta autorização?' })).toBeNull();
  });

  it('sem motivo não envia motivo nenhum', async () => {
    const { cancelAuthorizationService, authorizationId, rendered } = renderDetail(ana);
    await rendered;

    await openDialog();
    await confirm();

    await screen.findByText('Cancelada');
    expect(cancelAuthorizationService.calls).toEqual([{ id: authorizationId, motivo: undefined }]);
  });

  it('o selo muda também na lista que está no cache, sem precisar reabrir', async () => {
    const { authorizationId, queryClient, rendered } = renderDetail(ana);
    await rendered;

    await openDialog();
    await confirm();
    await screen.findByText('Cancelada');

    const cached = queryClient.getQueryData<InfiniteData<Page<Autorizacao>>>(listKey);
    expect(cached?.pages[0].data.find((a) => a.id === authorizationId)?.situacaoEfetiva).toBe(
      'CANCELADA',
    );
    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true);
  });

  it('cancelar uma que outra pessoa já cancelou não gera erro e mostra o estado atual', async () => {
    const { authorizations, authorizationId, rendered } = renderDetail(ana);
    await rendered;
    await openDialog();
    authorizations.cancel(authorizationId, 'Cancelada antes', {
      id: 'outro',
      nome: 'Carla Mendes',
    });

    await confirm();

    expect(await screen.findByText('Motivo: Cancelada antes')).toBeOnTheScreen();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText(/^Cancelada por Carla Mendes em/)).toBeOnTheScreen();
  });

  it('falha ao cancelar mostra o erro dentro do diálogo, que continua aberto', async () => {
    const { cancelAuthorizationService, rendered } = renderDetail(ana);
    cancelAuthorizationService.willFail(new ApiError(null, 'NETWORK', 'Sem conexão'));
    await rendered;

    await openDialog();
    await confirm();

    expect(
      within(await screen.findByRole('alert')).getByText(
        'Sem conexão com o servidor. Verifique sua internet e tente de novo.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Cancelar esta autorização?' })).toBeOnTheScreen();
    expect(screen.getByText('Ativa')).toBeOnTheScreen();
  });

  it('abrir o diálogo de novo começa sem o motivo nem o erro da vez anterior', async () => {
    const { cancelAuthorizationService, rendered } = renderDetail(ana);
    cancelAuthorizationService.willFail(new ApiError(500, 'INTERNAL_ERROR', ''));
    await rendered;

    await openDialog();
    await fireEvent.changeText(screen.getByLabelText('Motivo (opcional)'), 'Primeiro');
    await confirm();
    await screen.findByRole('alert');
    const back = screen.getAllByRole('button', { name: 'Voltar' });
    await fireEvent.press(back[back.length - 1]);

    await openDialog();

    expect(screen.getByLabelText('Motivo (opcional)')).toHaveProp('value', '');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('autorização que não existe mostra "Autorização não encontrada."', async () => {
    const { onBack, rendered } = renderDetail(ana, 'nao-existe');
    await rendered;

    expect(await screen.findByText('Autorização não encontrada.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar para a lista' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('falha ao carregar mostra o erro com "Tentar novamente"', async () => {
    const context = renderDetail(ana);
    context.getAuthorizationService.willFail(new ApiError(null, 'NETWORK', 'Sem conexão'));
    await context.rendered;

    expect(await screen.findByText('Não foi possível carregar a autorização.')).toBeOnTheScreen();
    context.getAuthorizationService.willFail(null);
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() => expect(screen.getByText('Ana Lima')).toBeOnTheScreen());
  });
});
