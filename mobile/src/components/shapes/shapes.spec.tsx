import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { polarPath } from './paths';
import { Arch, Circle, Clover4, Cookie12, Sun8 } from '.';

describe('formas', () => {
  it('desenha a forma polar no viewBox 0 0 100 100, começando à direita do centro', () => {
    const path = polarPath((theta) => 0.9 + 0.1 * Math.cos(8 * theta));

    expect(path.startsWith('M100.0 50.0 L')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
  });

  it.each([
    ['Cookie12', Cookie12],
    ['Clover4', Clover4],
    ['Arch', Arch],
    ['Sun8', Sun8],
    ['Circle', Circle],
  ])('%s desenha no tamanho pedido e centraliza o conteúdo', async (_, Shape) => {
    await render(
      <Shape size={56} color="#B5C4FF" testID="forma">
        <Text>✓</Text>
      </Shape>,
    );

    expect(screen.getByTestId('forma')).toHaveStyle({ width: 56, height: 56 });
    expect(screen.getByText('✓')).toBeOnTheScreen();
  });
});
