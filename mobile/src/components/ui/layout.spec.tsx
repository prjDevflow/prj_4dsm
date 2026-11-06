import { fireEvent, render, screen } from '@testing-library/react-native';
import { colors, ThemeProvider, typography } from '@/theme';
import { Fab } from './Fab';
import { Header } from './Header';
import { ScreenContainer } from './ScreenContainer';
import { Text } from './Text';

describe('Header', () => {
  it('mostra o título como cabeçalho e o "Voltar" chama onBack', async () => {
    const onBack = jest.fn();
    await render(<Header title="Minhas autorizações" onBack={onBack} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

    expect(screen.getByRole('header', { name: 'Minhas autorizações' })).toBeOnTheScreen();
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('sem onBack não mostra o "Voltar"', async () => {
    await render(<Header title="Administração" />);

    expect(screen.queryByRole('button', { name: 'Voltar' })).toBeNull();
  });

  it('o "Voltar" tem área de toque de 48 × 48', async () => {
    await render(<Header title="Usuários" onBack={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Voltar' })).toHaveStyle({
      minWidth: 48,
      minHeight: 48,
    });
  });

  it('usa o título de 28 na pessoa e o de 22 no administrador', async () => {
    await render(
      <>
        <Header title="Pessoa" />
        <ThemeProvider scale="admin">
          <Header title="Admin" />
        </ThemeProvider>
      </>,
    );

    expect(screen.getByText('Pessoa')).toHaveStyle(typography.pessoaTitulo);
    expect(screen.getByText('Admin')).toHaveStyle(typography.adminTitulo);
  });
});

describe('ScreenContainer', () => {
  it('rodapé em linha põe lado a lado os itens de um fragmento ("Cancelar" e "Salvar")', async () => {
    await render(
      <ScreenContainer
        footerDirection="row"
        footer={
          <>
            <Text>Cancelar</Text>
            <Text>Salvar</Text>
          </>
        }
      >
        <Text>Nome completo</Text>
      </ScreenContainer>,
    );

    expect(screen.getAllByTestId('footer-item')).toHaveLength(2);
  });

  it('mostra o conteúdo e o rodapé fixo', async () => {
    await render(
      <ScreenContainer footer={<Text>Salvar</Text>}>
        <Text>Nome completo</Text>
      </ScreenContainer>,
    );

    expect(screen.getByText('Nome completo')).toBeOnTheScreen();
    expect(screen.getByText('Salvar')).toBeOnTheScreen();
  });
});

describe('Fab', () => {
  it('é um botão com rótulo, no container primário, e chama onPress', async () => {
    const onPress = jest.fn();
    await render(<Fab label="Novo usuário" icon="person_add" onPress={onPress} />);

    const fab = screen.getByRole('button', { name: 'Novo usuário' });
    await fireEvent.press(fab);

    expect(fab).toHaveStyle({ backgroundColor: colors.primariaContainer, borderRadius: 16 });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('na variante catraca fica amarelo', async () => {
    await render(
      <Fab label="Abrir catraca" icon="qr_code_scanner" variant="catraca" onPress={jest.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Abrir catraca' })).toHaveStyle({
      backgroundColor: colors.acao,
    });
  });
});
