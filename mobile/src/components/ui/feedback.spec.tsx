import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { AccessibilityInfo, Pressable, Text as NativeText } from 'react-native';
import { colors } from '@/theme';
import { Alert } from './Alert';
import { Dialog } from './Dialog';
import { EmptyState, ErrorState, LoadingState, OfflineBanner } from './states';
import { ToastProvider, useToast } from './Toast';

describe('Alert', () => {
  it('é anunciado pelo leitor de tela e mostra a mensagem', async () => {
    await render(<Alert tone="info" message="Sua sessão expirou. Entre novamente." />);

    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('Sua sessão expirou. Entre novamente.')).toBeOnTheScreen();
  });

  it.each([
    ['info', colors.primariaContainer, colors.primariaContainerSobre],
    ['aviso', colors.aviso, colors.acaoSobre],
    ['erro', colors.erroContainer, colors.erroContainerSobre],
    ['sucesso', colors.sucessoContainer, colors.sucessoContainerSobre],
  ] as const)('o tom %s usa as cores do tokens.md', async (tone, background, text) => {
    await render(<Alert tone={tone} message="Mensagem" />);

    expect(screen.getByRole('alert')).toHaveStyle({
      backgroundColor: background,
      borderRadius: 16,
    });
    expect(screen.getByText('Mensagem')).toHaveStyle({ color: text });
  });
});

describe('Dialog', () => {
  const props = {
    visible: true,
    title: 'Cancelar esta autorização?',
    message: 'Isso não pode ser desfeito.',
    cancelLabel: 'Voltar',
    confirmLabel: 'Cancelar',
    destructive: true,
  };

  it('confirmar chama onConfirm e cancelar chama onCancel', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    await render(<Dialog {...props} onConfirm={onConfirm} onCancel={onCancel} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('mostra o título como cabeçalho, o texto e o botão perigoso com a ação', async () => {
    await render(<Dialog {...props} onConfirm={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.getByRole('header', { name: 'Cancelar esta autorização?' })).toBeOnTheScreen();
    expect(screen.getByText('Isso não pode ser desfeito.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveStyle({
      backgroundColor: colors.erro,
    });
  });

  it('fechado não mostra nada', async () => {
    await render(<Dialog {...props} visible={false} onConfirm={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.queryByText('Cancelar esta autorização?')).toBeNull();
  });
});

describe('Toast', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const ShowButton = () => {
    const toast = useToast();
    return (
      <Pressable accessibilityRole="button" onPress={() => toast.show('Autorização criada.')}>
        <NativeText>Mostrar</NativeText>
      </Pressable>
    );
  };

  it('mostra o aviso curto, anuncia pelo leitor de tela e some em cerca de 3 s', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    await render(
      <ToastProvider>
        <ShowButton />
      </ToastProvider>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar' }));

    expect(screen.getByText('Autorização criada.')).toBeOnTheScreen();
    expect(announce).toHaveBeenCalledWith('Autorização criada.');

    await act(() => jest.advanceTimersByTime(3000));
    expect(screen.queryByText('Autorização criada.')).toBeNull();
  });
});

describe('estados da T31', () => {
  it('LoadingState mostra "Carregando…" e avisa que está ocupado', async () => {
    await render(<LoadingState />);

    expect(screen.getByText('Carregando…')).toBeOnTheScreen();
    expect(screen.getByLabelText('Carregando…')).toBeBusy();
  });

  it('EmptyState mostra o título, o texto e a ação', async () => {
    const onPress = jest.fn();
    await render(
      <EmptyState
        icon="search_off"
        title="Nenhum usuário encontrado."
        message="Tente outro nome ou limpe os filtros."
        action={{ label: 'Limpar filtros', onPress }}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Limpar filtros' }));

    expect(screen.getByRole('header', { name: 'Nenhum usuário encontrado.' })).toBeOnTheScreen();
    expect(screen.getByText('Tente outro nome ou limpe os filtros.')).toBeOnTheScreen();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ErrorState: "Tentar novamente" chama onRetry', async () => {
    const onRetry = jest.fn();
    await render(<ErrorState onRetry={onRetry} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(screen.getByText('Não foi possível carregar.')).toBeOnTheScreen();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('ErrorState aceita o tempo esgotado com outro título', async () => {
    await render(
      <ErrorState
        icon="hourglass_disabled"
        tone="neutro"
        title="O servidor demorou para responder."
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByText('O servidor demorou para responder.')).toBeOnTheScreen();
  });

  it('OfflineBanner é anunciado e tem "Tentar novamente"', async () => {
    const onRetry = jest.fn();
    await render(<OfflineBanner onRetry={onRetry} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(within(screen.getByRole('alert')).getByText('Sem internet')).toBeOnTheScreen();
    expect(screen.getByTestId('offline-banner')).toHaveStyle({ backgroundColor: colors.aviso });
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
