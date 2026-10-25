import { darkPalette, lightPalette, type Palette } from '../../src/ui/theme';
import { contrastRatio } from '../../src/ui/theme/contrast';

/** Pares texto/fondo que aparecen en la app. */
const TEXT_PAIRS: [keyof Palette, keyof Palette][] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['text', 'surfaceMuted'],
  ['textMuted', 'background'],
  ['textMuted', 'surface'],
  ['primary', 'background'],
  ['primary', 'surface'],
  ['primary', 'primarySoft'],
  ['onPrimary', 'primary'],
  ['onPrimary', 'primaryPressed'],
  ['text', 'primarySoft'],
  ['text', 'warningSoft'],
  ['text', 'dangerSoft'],
  ['text', 'successSoft'],
  ['success', 'surface'],
  ['success', 'successSoft'],
  ['danger', 'surface'],
  ['danger', 'dangerSoft'],
  ['onPrimary', 'danger'],
  ['text', 'heatLow'],
  ['text', 'heatMid'],
  ['text', 'heatHigh'],
  ['text', 'heatNone'],
  ['textMuted', 'surfaceMuted'],
  ['warning', 'surface'],
];

/** Gráficos e indicadores (WCAG 1.4.11): al menos 3:1. */
const GRAPHIC_PAIRS: [keyof Palette, keyof Palette][] = [
  ['accent', 'surface'],
  ['primary', 'surfaceMuted'],
  ['focus', 'surface'],
  ['borderStrong', 'surface'],
  ['borderStrong', 'background'],
];

describe.each([
  ['claro', lightPalette],
  ['oscuro', darkPalette],
])('paleta en modo %s', (_name, palette) => {
  it.each(TEXT_PAIRS)('%s sobre %s cumple 4,5:1', (fg, bg) => {
    expect(contrastRatio(palette[fg], palette[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(GRAPHIC_PAIRS)('%s sobre %s cumple 3:1', (fg, bg) => {
    expect(contrastRatio(palette[fg], palette[bg])).toBeGreaterThanOrEqual(3);
  });
});
