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
  const { colors } = useAppTheme();
  const isHeading = variant === 'display' || variant === 'title' || variant === 'heading';
  return (
    <Text
      accessibilityRole={accessibilityRole ?? (isHeading ? 'header' : undefined)}
      maxFontSizeMultiplier={1.8}
      style={[typography[variant], { color: color ?? (muted ? colors.textMuted : colors.text) }, style]}
      {...rest}
    />
  );
}
