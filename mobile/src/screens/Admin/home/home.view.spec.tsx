import { fireEvent, render, screen } from '@testing-library/react-native';
import { AdminHomeView } from './home.view';

const props = {
  nome: 'Carla Mendes',
  isOffline: false,
  onOpenAccount: jest.fn(),
  onOpenArea: jest.fn(),
  onOpenScanner: jest.fn(),
  logoutDialogVisible: false,
  onRequestLogout: jest.fn(),
  onCancelLogout: jest.fn(),
  onConfirmLogout: jest.fn(),
};

describe('AdminHomeView (T14)', () => {
  it('mostra "Administração", o nome de quem está logado e as iniciais que abrem a conta', async () => {
    await render(<AdminHomeView {...props} />);

    expect(screen.getByRole('header', { name: 'Administração' })).toBeOnTheScreen();
    expect(screen.getByText('Carla Mendes')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Minha conta' })).toBeOnTheScreen();
  });

  it.each([
    ['Autorizações', 'Criar, consultar e cancelar', 'autorizacoes'],
    ['Usuários', 'Pessoas e perfis', 'usuarios'],
    ['Locais e terminais', 'Edifícios e catracas', 'locais'],
    ['Tags NFC', 'Vincular às pessoas', 'tags'],
    ['Histórico', 'Tentativas de acesso', 'historico'],
  ])('o bloco "%s" (%s) abre a área %s', async (title, subtitle, area) => {
    const onOpenArea = jest.fn();
    await render(<AdminHomeView {...props} onOpenArea={onOpenArea} />);

    await fireEvent.press(screen.getByRole('button', { name: `${title}, ${subtitle}` }));

    expect(onOpenArea).toHaveBeenCalledWith(area);
  });

  it('o botão flutuante amarelo "Abrir catraca" abre o leitor', async () => {
    const onOpenScanner = jest.fn();
    await render(<AdminHomeView {...props} onOpenScanner={onOpenScanner} />);

    const fab = screen.getByRole('button', { name: 'Abrir catraca' });
    await fireEvent.press(fab);

    expect(fab).toHaveStyle({ backgroundColor: '#FFD95C' });
    expect(onOpenScanner).toHaveBeenCalledTimes(1);
  });

  it('"Sair" pede confirmação', async () => {
    const onRequestLogout = jest.fn();
    await render(<AdminHomeView {...props} onRequestLogout={onRequestLogout} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Sair' }));

    expect(onRequestLogout).toHaveBeenCalledTimes(1);
  });

  it('sem internet, mostra a faixa "Sem internet"', async () => {
    await render(<AdminHomeView {...props} isOffline />);

    expect(screen.getByText('Sem internet')).toBeOnTheScreen();
  });
});
