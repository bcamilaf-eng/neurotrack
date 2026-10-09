import { Text, type TextProps } from 'react-native';
import { typography } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';

type Variant = keyof typeof typography;

export interface AppTextProps extends TextProps {
  variant?: Variant;
  muted?: boolean;
  color?: string;
}

/** Texto con la tipografía del sistema visual. Respeta el tamaño de letra del dispositivo. */
export function AppText({ variant = 'body', muted, color, style, accessibilityRole, ...rest }: AppTextProps) {
  const { colors, textScale } = useAppTheme();
  const base = typography[variant];
  const scaled = textScale === 1 ? base : { ...base, fontSize: base.fontSize * textScale, lineHeight: base.lineHeight * textScale };
  const isHeading = variant === 'display' || variant === 'title' || variant === 'heading';
  return (
    <Text
      accessibilityRole={accessibilityRole ?? (isHeading ? 'header' : undefined)}
      maxFontSizeMultiplier={1.8}
      style={[scaled, { color: color ?? (muted ? colors.textMuted : colors.text) }, style]}
      {...rest}
    />
  );
}
