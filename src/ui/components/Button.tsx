import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { elevation, MIN_TOUCH, radius, spacing } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Icono de Ionicons a la izquierda del texto. */
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** `large` para la acción principal de una pantalla. */
  size?: 'regular' | 'large';
  loading?: boolean;
  disabled?: boolean;
  /** Descripción adicional para lectores de pantalla. */
  hint?: string;
  testID?: string;
}

/** Botón grande (mínimo 48 dp) que cede al pulsarlo, con estados de carga y deshabilitado accesibles. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  size = 'regular',
  loading,
  disabled,
  hint,
  testID,
}: ButtonProps) {
  const { colors, dark } = useAppTheme();
  const inactive = disabled || loading;
  const palette = {
    primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: colors.onPrimary },
    secondary: { bg: colors.primarySoft, pressed: colors.border, fg: colors.primary },
    ghost: { bg: 'transparent', pressed: colors.surfaceMuted, fg: colors.primary },
    danger: { bg: colors.danger, pressed: colors.danger, fg: colors.onPrimary },
  }[variant];
  const raised = variant === 'primary' || variant === 'danger';

  return (
    <PressableScale
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={[
        styles.base,
        size === 'large' && styles.large,
        { backgroundColor: palette.bg, opacity: inactive ? 0.5 : 1 },
        raised && !inactive ? elevation(colors, dark, size === 'large' ? 2 : 1) : null,
      ]}
      pressedStyle={{ backgroundColor: palette.pressed }}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={palette.fg} />
        ) : icon ? (
          <Ionicons name={icon} size={size === 'large' ? 22 : 20} color={palette.fg} importantForAccessibility="no" />
        ) : null}
        <AppText variant={size === 'large' ? 'heading' : 'label'} color={palette.fg}>
          {label}
        </AppText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH + 4,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  large: { minHeight: MIN_TOUCH + 16, borderRadius: radius.lg },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
});
