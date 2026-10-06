/**
 * Sistema visual de NEUROTRACK.
 *
 * Paleta índigo-azulada (asociada a neurología y calma) con un acento turquesa.
 * Todos los pares texto/fondo cumplen contraste WCAG AA (≥ 4,5:1) en ambos modos.
 * Los colores de estado se acompañan siempre de texto o icono: nunca transmiten
 * información por sí solos.
 */
import { useColorScheme } from 'react-native';

export interface Palette {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  primarySoft: string;
  accent: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  success: string;
  focus: string;
}

export const lightPalette: Palette = {
  background: '#F6F7FB',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF1F8',
  border: '#D5DAE6',
  text: '#121A2E',
  textMuted: '#4A5470',
  primary: '#3346C8',
  onPrimary: '#FFFFFF',
  primarySoft: '#E5E9FB',
  accent: '#0F7C83',
  danger: '#B42318',
  dangerSoft: '#FDECEA',
  warning: '#8A5300',
  warningSoft: '#FFF4E0',
  success: '#1E7A3E',
  focus: '#3346C8',
};

export const darkPalette: Palette = {
  background: '#0C1120',
  surface: '#151C30',
  surfaceMuted: '#1D2640',
  border: '#2E3A5C',
  text: '#EEF1FA',
  textMuted: '#AEB7D0',
  primary: '#8C9BFF',
  onPrimary: '#0C1120',
  primarySoft: '#232E57',
  accent: '#5CC8CF',
  danger: '#FF8A80',
  dangerSoft: '#3A1D1D',
  warning: '#F7C46C',
  warningSoft: '#3A2D14',
  success: '#7BD99A',
  focus: '#8C9BFF',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

/** Tamaños de texto base; se escalan con la preferencia del sistema (Dynamic Type). */
export const typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '700' as const },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
};

/** Área táctil mínima (dp) recomendada por las guías de accesibilidad de iOS y Android. */
export const MIN_TOUCH = 48;

export interface Theme {
  dark: boolean;
  colors: Palette;
  /** Multiplicador de texto elegido en la app (se suma al del sistema). */
  textScale: number;
}

export const TEXT_SCALES = [
  { code: '1', label: 'Normal' },
  { code: '1.15', label: 'Grande' },
  { code: '1.3', label: 'Muy grande' },
] as const;

export function useTheme(override?: 'system' | 'light' | 'dark', textScale = 1): Theme {
  const system = useColorScheme();
  const dark = override === 'dark' || ((!override || override === 'system') && system === 'dark');
  return { dark, colors: dark ? darkPalette : lightPalette, textScale };
}
