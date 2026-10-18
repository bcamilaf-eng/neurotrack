/**
 * Tipografía: Plus Jakarta Sans para títulos y cifras, Inter para el texto.
 * Se cargan solo los grosores que se usan, importando cada uno por separado
 * para no empaquetar toda la familia.
 */
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';

export const FONTS = {
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  display: 'PlusJakartaSans_700Bold',
  displayHeavy: 'PlusJakartaSans_800ExtraBold',
} as const;

/** Para `useFonts` en la raíz de la app. */
export const FONT_ASSETS = {
  [FONTS.body]: Inter_400Regular,
  [FONTS.bodyMedium]: Inter_500Medium,
  [FONTS.bodySemibold]: Inter_600SemiBold,
  [FONTS.display]: PlusJakartaSans_700Bold,
  [FONTS.displayHeavy]: PlusJakartaSans_800ExtraBold,
};
