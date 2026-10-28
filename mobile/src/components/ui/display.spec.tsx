import { fireEvent, render, screen } from '@testing-library/react-native';
import { colors } from '@/theme';
import { Card } from './Card';
import { FilterChip } from './FilterChip';
import { ListItem } from './ListItem';
import { NavRow } from './NavRow';
import { ProgressBar } from './ProgressBar';
import { StatusBadge, type BadgeStatus } from './StatusBadge';
import { Text } from './Text';

describe('FilterChip', () => {
  it('selecionado mostra o check, fica no container primário e marcado', async () => {
    await render(<FilterChip label="Todos" selected onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Todos' })).toBeSelected();
    expect(screen.getByTestId('chip-check', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByTestId('chip-box')).toHaveStyle({
      backgroundColor: colors.primariaContainer,
      borderRadius: 8,
    });
  });

  it('padrão tem contorno, sem check, e o toque chama onPress', async () => {
    const onPress = jest.fn();
    await render(<FilterChip label="Condômino" selected={false} onPress={onPress} />);

    const chip = screen.getByRole('button', { name: 'Condômino' });
    await fireEvent.press(chip);

    expect(chip).not.toBeSelected();
    expect(screen.queryByTestId('chip-check', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByTestId('chip-box')).toHaveStyle({ borderColor: colors.contorno });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('tem área de toque de 48 de altura', async () => {
    await render(<FilterChip label="Todos" selected onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Todos' })).toHaveStyle({ minHeight: 48 });
  });
});

describe('StatusBadge', () => {
  it.each<[BadgeStatus, string, string, string]>([
    ['ATIVA', 'Ativa', colors.sucessoContainer, colors.sucessoContainerSobre],
    ['CANCELADA', 'Cancelada', colors.erroContainer, colors.erroContainerSobre],
    ['EXPIRADA', 'Expirada', colors.superficieMaxima, colors.textoApoio],
    ['ESGOTADA', 'Esgotada', colors.superficieMaxima, colors.textoApoio],
    ['ONLINE', 'Online', colors.sucessoContainer, colors.sucessoContainerSobre],
    ['OFFLINE', 'Offline', colors.aviso, colors.acaoSobre],
    ['INATIVO', 'Inativo', colors.superficieMaxima, colors.textoApoio],
  ])('%s mostra "%s" com o fundo e o texto do seu tom', async (status, label, background, text) => {
    await render(<StatusBadge status={status} />);

    expect(screen.getByText(label)).toHaveStyle({ color: text });
    expect(screen.getByTestId('status-badge')).toHaveStyle({
      backgroundColor: background,
      minHeight: 26,
      borderRadius: 8,
    });
  });

  it.each([
    ['AUTORIZADO', 'Autorizado', colors.sucessoSobre],
    ['NEGADO', 'Negado', colors.erroSobre],
  ] as const)('%s mostra o selo cookie com ícone e o texto', async (status, label, iconColor) => {
    await render(<StatusBadge status={status} />);

    expect(screen.getByText(label)).toBeOnTheScreen();
    expect(screen.getByTestId('status-cookie', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByTestId('status-icon', { includeHiddenElements: true })).toHaveStyle({
      color: iconColor,
    });
  });

  it('aceita tom e texto livres, como o perfil do usuário', async () => {
    await render(<StatusBadge tone="primario" label="Administrador" />);

    expect(screen.getByText('Administrador')).toHaveStyle({ color: colors.primariaContainerSobre });
    expect(screen.getByTestId('status-badge')).toHaveStyle({
      backgroundColor: colors.primariaContainer,
    });
  });
});

describe('Card', () => {
  it('sem onPress é só um contêiner na superfície, com raio 20', async () => {
    await render(
      <Card testID="cartao">
        <Text>Local</Text>
      </Card>,
    );

    expect(screen.getByText('Local')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByTestId('cartao')).toHaveStyle({
      backgroundColor: colors.superficie,
      borderRadius: 20,
    });
  });

  it('com onPress vira um botão com o rótulo', async () => {
    const onPress = jest.fn();
    await render(
      <Card accessibilityLabel="Catraca Social, Edifício Central" onPress={onPress}>
        <Text>Catraca Social</Text>
      </Card>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Catraca Social, Edifício Central' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('ListItem', () => {
  it('mostra título, subtítulo e selo, e com onPress é um botão que lê tudo', async () => {
    const onPress = jest.fn();
    await render(
      <ListItem
        title="Maria Souza"
        subtitle="maria.souza@email.com"
        badge={{ tone: 'neutro', label: 'Condômino' }}
        onPress={onPress}
      />,
    );

    await fireEvent.press(
      screen.getByRole('button', { name: 'Maria Souza, maria.souza@email.com, Condômino' }),
    );

    expect(screen.getByText('Maria Souza')).toBeOnTheScreen();
    expect(screen.getByText('Condômino')).toBeOnTheScreen();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('sem onPress não é botão', async () => {
    await render(<ListItem title="Catraca Social" subtitle="QR Code" />);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Catraca Social')).toBeOnTheScreen();
  });
});

describe('NavRow', () => {
  it('é um botão com o texto e o detalhe, na superfície alta, raio 20 e 64 de altura', async () => {
    const onPress = jest.fn();
    await render(
      <NavRow
        icon="tablet_android"
        label="Terminais"
        detail="4 terminais, 1 offline"
        onPress={onPress}
      />,
    );

    const row = screen.getByRole('button', { name: 'Terminais, 4 terminais, 1 offline' });
    await fireEvent.press(row);

    expect(row).toHaveStyle({
      backgroundColor: colors.superficieAlta,
      borderRadius: 20,
      minHeight: 64,
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('ProgressBar', () => {
  it('mostra a proporção em dois retângulos de 8 e informa o valor ao leitor de tela', async () => {
    await render(<ProgressBar value={1} total={3} accessibilityLabel="Entradas usadas" />);

    expect(screen.getByRole('progressbar', { name: 'Entradas usadas' })).toHaveAccessibilityValue({
      min: 0,
      max: 3,
      now: 1,
    });
    expect(screen.getByTestId('progress-fill')).toHaveStyle({
      flexGrow: 1,
      height: 8,
      backgroundColor: colors.primaria,
    });
    expect(screen.getByTestId('progress-rest')).toHaveStyle({
      flexGrow: 2,
      height: 8,
      backgroundColor: colors.superficieMaxima,
    });
  });

  it('cheio não mostra o resto, e o valor nunca passa do total', async () => {
    await render(<ProgressBar value={5} total={3} accessibilityLabel="Entradas usadas" />);

    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 3 });
    expect(screen.queryByTestId('progress-rest')).toBeNull();
  });
});
