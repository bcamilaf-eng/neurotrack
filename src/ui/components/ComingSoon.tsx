import { StyleSheet, View } from 'react-native';
import { radius, spacing } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

/** Marca una sección que llega en una próxima versión, sin simular funcionalidad. */
export function ComingSoon({ title, description }: { title: string; description: string }) {
  const { colors } = useAppTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${title}. Próximamente. ${description}`}
      style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}
    >
      <View style={styles.row}>
        <AppText variant="label" style={styles.title}>
          {title}
        </AppText>
        <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
          <AppText variant="caption" color={colors.primary}>
            Próximamente
          </AppText>
        </View>
      </View>
      <AppText variant="caption" muted>
        {description}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.md, padding: spacing.lg, gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1 },
  badge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
});
