import { renderHook, render, screen } from '@testing-library/react-native';
import type { TestInstance } from 'test-renderer';
import { useCatalogModel } from './catalog.model';
import { CatalogView } from './catalog.view';

jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
  DateTimePickerAndroid: { open: jest.fn() },
}));

const renderCatalog = async (scale: 'pessoa' | 'admin' = 'pessoa') => {
  const { result } = await renderHook(() => useCatalogModel());
  await render(<CatalogView {...result.current} scale={scale} onBack={jest.fn()} />);
};

// Host elements that receive a tap (Pressable) or text (TextInput).
const isInteractive = (node: TestInstance) =>
  node.type === 'TextInput' ||
  (node.type === 'View' && typeof node.props.onResponderRelease === 'function');

describe('CatalogView', () => {
  it('mostra uma seção para cada grupo de componentes', async () => {
    await renderCatalog();

    for (const section of [
      'Cores',
      'Tipografia',
      'Formas',
      'Ícones',
      'Botões',
      'Campos',
      'Filtros e selos',
      'Cartões e listas',
      'Avisos e diálogos',
      'Estados (T31)',
    ]) {
      expect(screen.getByRole('header', { name: section })).toBeOnTheScreen();
    }
  });

  it.each(['pessoa', 'admin'] as const)(
    'na escala %s, todo elemento interativo tem papel e rótulo de acessibilidade',
    async (scale) => {
      await renderCatalog(scale);

      const interactive = screen.container.queryAll(isInteractive);
      expect(interactive.length).toBeGreaterThan(30);

      const missing = interactive
        .filter(
          (node) =>
            !node.props.accessibilityLabel ||
            (node.type !== 'TextInput' && !node.props.accessibilityRole),
        )
        .map((node) => `${node.type} ${JSON.stringify(node.props.accessibilityLabel)}`);
      expect(missing).toEqual([]);
    },
  );
});
