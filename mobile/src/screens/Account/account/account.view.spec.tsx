import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccountView } from './account.view';

const props = {
  nome: 'Maria Souza',
  email: 'maria.souza@email.com',
  perfil: 'Condômino',
  isAdmin: false,
  appVersion: '0.1.0',
  onBack: jest.fn(),
  logoutDialogVisible: false,
  onRequestLogout: jest.fn(),
  onCancelLogout: jest.fn(),
  onConfirmLogout: jest.fn(),
};

describe('AccountView (T13)', () => {
  it('mostra iniciais, nome, perfil e os dados só para leitura', async () => {
    await render(<AccountView {...props} />);

    expect(screen.getByRole('header', { name: 'Minha conta' })).toBeOnTheScreen();
    expect(screen.getByText('MS')).toBeOnTheScreen();
    expect(screen.getAllByText('Maria Souza').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('maria.souza@email.com')).toBeOnTheScreen();
    expect(screen.getAllByText('Condômino').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText('Para mudar seus dados ou sua senha, procure a administração.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Versão 0.1.0')).toBeOnTheScreen();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('"Voltar" chama onBack e "Sair" pede confirmação', async () => {
    const onBack = jest.fn();
    const onRequestLogout = jest.fn();
    await render(<AccountView {...props} onBack={onBack} onRequestLogout={onRequestLogout} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Sair' }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onRequestLogout).toHaveBeenCalledTimes(1);
  });
});
