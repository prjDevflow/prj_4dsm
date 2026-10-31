import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { colors } from './colors';
import { ThemeProvider, useTheme } from './ThemeProvider';

describe('ThemeProvider', () => {
  it('sem provedor, entrega o tema escuro na escala da pessoa', async () => {
    const { result } = await renderHook(() => useTheme());

    expect(result.current.colors).toBe(colors);
    expect(result.current.scale).toBe('pessoa');
  });

  it('as telas do administrador pedem a escala compacta', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ThemeProvider scale="admin">{children}</ThemeProvider>
    );
    const { result } = await renderHook(() => useTheme(), { wrapper });

    expect(result.current.scale).toBe('admin');
    expect(result.current.colors.fundo).toBe('#121318');
  });
});
