import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { colors } from './colors';
import { radius, sizes } from './radius';
import { screenMargin, spacing } from './spacing';
import { fontFamily, typography } from './typography';

/** "pessoa": large scale (T01 to T13). "admin": compact scale (T14 to T31). */
export type Scale = 'pessoa' | 'admin';

const darkTheme = { colors, typography, fontFamily, spacing, screenMargin, radius, sizes };

export type Theme = typeof darkTheme & { scale: Scale };

// Dark is the only theme for now (❓ 2); the light one arrives with its own tokens.
const ThemeContext = createContext<Theme>({ ...darkTheme, scale: 'pessoa' });

type ThemeProviderProps = { scale?: Scale; children: ReactNode };

export const ThemeProvider = ({ scale = 'pessoa', children }: ThemeProviderProps) => {
  const theme = useMemo(() => ({ ...darkTheme, scale }), [scale]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
