import { Pressable, StyleSheet, View } from 'react-native';
import { MIN_TOUCH, spacing } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}

/** Fila de lista navegable (ajustes, perfil). */
export function ListRow({ title, subtitle, value, onPress, destructive }: ListRowProps) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={[title, value, subtitle].filter(Boolean).join('. ')}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={styles.text}>
        <AppText variant="label" color={destructive ? colors.danger : undefined}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" muted>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? <AppText muted>{value}</AppText> : null}
      {onPress ? (
        <AppText muted importantForAccessibility="no">
          ›
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: MIN_TOUCH + 8,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1, gap: 2 },
});
