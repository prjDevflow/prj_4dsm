import { fireEvent, render, screen } from '@testing-library/react-native';
import { UserHomeView } from './home.view';

const props = {
  nome: 'Maria Souza',
  greeting: 'Olá, Maria',
  isOffline: false,
  activeCount: 0,
  onOpenAccount: jest.fn(),
  onOpenScanner: jest.fn(),
  onOpenAuthorizations: jest.fn(),
  onOpenHistory: jest.fn(),
  logoutDialogVisible: false,
  onRequestLogout: jest.fn(),
  onCancelLogout: jest.fn(),
  onConfirmLogout: jest.fn(),
};

describe('UserHomeView (T03)', () => {
  it('cumprimenta pelo primeiro nome e mostra as iniciais que abrem a conta', async () => {
    const onOpenAccount = jest.fn();
    await render(<UserHomeView {...props} onOpenAccount={onOpenAccount} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Minha conta' }));

    expect(screen.getByRole('header', { name: 'Olá, Maria' })).toBeOnTheScreen();
    expect(screen.getByText('MS')).toBeOnTheScreen();
    expect(onOpenAccount).toHaveBeenCalledTimes(1);
  });

  it('"Abrir catraca", "Minhas autorizações" e "Meu histórico" levam cada um ao seu lugar', async () => {
    const onOpenScanner = jest.fn();
    const onOpenAuthorizations = jest.fn();
    const onOpenHistory = jest.fn();
    await render(
      <UserHomeView
        {...props}
        onOpenScanner={onOpenScanner}
        onOpenAuthorizations={onOpenAuthorizations}
        onOpenHistory={onOpenHistory}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Abrir catraca' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Minhas autorizações' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Meu histórico' }));

    expect(onOpenScanner).toHaveBeenCalledTimes(1);
    expect(onOpenAuthorizations).toHaveBeenCalledTimes(1);
    expect(onOpenHistory).toHaveBeenCalledTimes(1);
  });

  it('sem autorização ativa, "Minhas autorizações" não mostra contador', async () => {
    await render(<UserHomeView {...props} />);

    expect(screen.getByRole('button', { name: 'Minhas autorizações' })).toBeOnTheScreen();
  });

  it.each([
    [1, 'Minhas autorizações, 1 ativa'],
    [2, 'Minhas autorizações, 2 ativas'],
  ])('com %i ativa(s), o contador é lido por extenso', async (activeCount, name) => {
    await render(<UserHomeView {...props} activeCount={activeCount} />);

    expect(screen.getByRole('button', { name })).toBeOnTheScreen();
    expect(screen.getByText(String(activeCount))).toBeOnTheScreen();
  });

  it('o "Abrir catraca" do início tem 100 de altura, na cor da ação', async () => {
    await render(<UserHomeView {...props} />);

    expect(screen.getByRole('button', { name: 'Abrir catraca' })).toHaveStyle({
      minHeight: 100,
      backgroundColor: '#FFD95C',
    });
  });

  it('"Sair" pede confirmação', async () => {
    const onRequestLogout = jest.fn();
    await render(<UserHomeView {...props} onRequestLogout={onRequestLogout} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Sair' }));

    expect(onRequestLogout).toHaveBeenCalledTimes(1);
  });

  it('o diálogo "Deseja sair?" tem "Cancelar" e "Sair"', async () => {
    const onCancelLogout = jest.fn();
    await render(<UserHomeView {...props} logoutDialogVisible onCancelLogout={onCancelLogout} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('header', { name: 'Deseja sair?' })).toBeOnTheScreen();
    expect(onCancelLogout).toHaveBeenCalledTimes(1);
  });

  it('sem internet, mostra a faixa "Sem internet"', async () => {
    await render(<UserHomeView {...props} isOffline />);

    expect(screen.getByText('Sem internet')).toBeOnTheScreen();
  });
});
