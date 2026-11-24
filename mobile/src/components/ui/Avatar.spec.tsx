import { fireEvent, render, screen } from '@testing-library/react-native';
import { colors } from '@/theme';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('mostra as iniciais num círculo do container primário', async () => {
    await render(<Avatar nome="Maria Souza" testID="avatar" />);

    expect(screen.getByText('MS')).toHaveStyle({ color: colors.primariaContainerSobre });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('com onPress é um botão com rótulo e toque de 48', async () => {
    const onPress = jest.fn();
    await render(<Avatar nome="Carla Mendes" accessibilityLabel="Minha conta" onPress={onPress} />);

    const button = screen.getByRole('button', { name: 'Minha conta' });
    await fireEvent.press(button);

    expect(button).toHaveStyle({ minWidth: 48, minHeight: 48 });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
