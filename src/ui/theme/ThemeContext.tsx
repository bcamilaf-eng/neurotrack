import { createContext, type ReactNode, useContext } from 'react';
import { type Theme, useTheme } from './index';

const ThemeContext = createContext<Theme | null>(null);

/** Proporciona el tema según la preferencia del usuario (sistema, claro u oscuro). */
export function ThemeProvider({ preference, children }: { preference?: 'system' | 'light' | 'dark'; children: ReactNode }) {
  const theme = useTheme(preference);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): Theme {
  const theme = useContext(ThemeContext);
  const fallback = useTheme();
  return theme ?? fallback;
}
