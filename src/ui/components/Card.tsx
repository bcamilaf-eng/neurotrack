import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { elevation, radius, spacing } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';

/** Superficie agrupadora: esquinas amplias, borde sutil y sombra mínima en modo claro. */
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { colors, dark } = useAppTheme();
  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, elevation(colors, dark), style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg, gap: spacing.md },
});
