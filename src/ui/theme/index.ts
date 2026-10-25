/**
 * Sistema visual de NEUROTRACK · «calma clínica».
 *
 * Fondos pizarra muy claros (u oscuros), un azul eléctrico como único color de acción
 * y un esmeralda para lo que va bien (días sin dolor, metas cumplidas).
 * Títulos en Plus Jakarta Sans, texto en Inter. Espaciado generoso y movimiento breve.
 *
 * Todos los pares texto/fondo cumplen contraste WCAG AA (≥ 4,5:1) en ambos modos
 * (`tests/unit/theme.test.ts`). El esmeralda puro (#10B981) solo se usa en rellenos
 * decorativos; para texto y gráficos se usan tonos más profundos de la misma familia.
 * Los colores de estado se acompañan siempre de texto o icono: nunca transmiten
 * información por sí solos.
 */
import { Platform, useColorScheme, type ViewStyle } from 'react-native';
import { FONTS } from './fonts';

export interface Palette {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  /** Borde de campos y controles: al menos 3:1 sobre la superficie (WCAG 1.4.11). */
  borderStrong: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  primarySoft: string;
  /** Esmeralda para gráficos e indicadores (≥ 3:1 sobre la superficie). */
  accent: string;
  accentSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  /** Esmeralda legible como texto. */
  success: string;
  successSoft: string;
  focus: string;
  shadow: string;
  /** Fondos del calendario por intensidad: tonos distinguibles entre sí, con texto legible encima. */
  heatLow: string;
  heatMid: string;
  heatHigh: string;
  heatNone: string;
}

export const lightPalette: Palette = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  border: '#E2E8F0',
  borderStrong: '#7C8BA1',
  text: '#0F172A',
  textMuted: '#475569',
  primary: '#2563EB',
  primaryPressed: '#1D4ED8',
  onPrimary: '#FFFFFF',
  primarySoft: '#EFF6FF',
  accent: '#059669',
  accentSoft: '#D1FAE5',
  danger: '#B91C1C',
  dangerSoft: '#FEF2F2',
  warning: '#B45309',
  warningSoft: '#FFFBEB',
  success: '#047857',
  successSoft: '#ECFDF5',
  focus: '#2563EB',
  shadow: '#0F172A',
  heatLow: '#DBEAFE',
  heatMid: '#FDE68A',
  heatHigh: '#FECACA',
  heatNone: '#D1FAE5',
};

export const darkPalette: Palette = {
  background: '#0F172A',
  surface: '#1E293B',
  surfaceMuted: '#273449',
  border: '#334155',
  borderStrong: '#6B7C93',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  primary: '#60A5FA',
  primaryPressed: '#3B82F6',
  onPrimary: '#0F172A',
  primarySoft: '#172554',
  accent: '#34D399',
  accentSoft: '#064E3B',
  danger: '#F87171',
  dangerSoft: '#450A0A',
  warning: '#FBBF24',
  warningSoft: '#422006',
  success: '#34D399',
  successSoft: '#052E2B',
  focus: '#60A5FA',
  shadow: '#000000',
  heatLow: '#1E3A8A',
  heatMid: '#78350F',
  heatHigh: '#7F1D1D',
  heatNone: '#064E3B',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 20, xl: 28, xxl: 40 } as const;
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

/**
 * Tamaños de texto base; se escalan con la preferencia del sistema (Dynamic Type).
 * Con fuentes propias, el grosor lo da la familia (Android ignora `fontWeight` en ellas).
 */
export const typography = {
  display: { fontFamily: FONTS.displayHeavy, fontSize: 32, lineHeight: 38, letterSpacing: -0.6 },
  title: { fontFamily: FONTS.display, fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  heading: { fontFamily: FONTS.display, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  body: { fontFamily: FONTS.body, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: FONTS.bodySemibold, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: FONTS.bodyMedium, fontSize: 14, lineHeight: 20 },
  /** Cifras destacadas (resúmenes): números de ancho fijo para que no bailen. */
  stat: {
    fontFamily: FONTS.displayHeavy,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums' as const],
  },
};

/** Área táctil mínima (dp) recomendada por las guías de accesibilidad de iOS y Android. */
export const MIN_TOUCH = 48;

/** Sombra suave para superficies elevadas. En modo oscuro se usa borde en su lugar. */
export function elevation(colors: Palette, dark: boolean, level: 1 | 2 = 1): ViewStyle {
  if (dark) return {};
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.shadow,
      shadowOpacity: level === 1 ? 0.05 : 0.1,
      shadowRadius: level === 1 ? 12 : 20,
      shadowOffset: { width: 0, height: level === 1 ? 4 : 10 },
    },
    default: { elevation: level === 1 ? 1 : 4, shadowColor: colors.shadow },
  });
}

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

export { FONTS, FONT_ASSETS } from './fonts';
export { motion, useReducedMotion } from './motion';
