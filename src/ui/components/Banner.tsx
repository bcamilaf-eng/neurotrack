import { StyleSheet, View } from 'react-native';
import { radius, spacing } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

export interface BannerProps {
  tone: 'info' | 'warning' | 'danger';
  title?: string;
  message: string;
}

const ICON = { info: 'ℹ', warning: '⚠', danger: '⛔' } as const;
const PREFIX = { info: 'Información', warning: 'Atención', danger: 'Importante' } as const;

/** Aviso destacado. El tipo se comunica con icono y texto además del color. */
export function Banner({ tone, title, message }: BannerProps) {
  const { colors } = useAppTheme();
  const palette = {
    info: { bg: colors.primarySoft, fg: colors.text, edge: colors.primary },
    warning: { bg: colors.warningSoft, fg: colors.text, edge: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.text, edge: colors.danger },
  }[tone];
  return (
    <View
      accessibilityRole={tone === 'info' ? 'summary' : 'alert'}
      accessibilityLabel={`${PREFIX[tone]}. ${title ? `${title}. ` : ''}${message}`}
      style={[styles.banner, { backgroundColor: palette.bg, borderLeftColor: palette.edge }]}
    >
      <AppText variant="label" color={palette.edge} importantForAccessibility="no">
        {ICON[tone]}
      </AppText>
      <View style={styles.text}>
        {title ? <AppText variant="label">{title}</AppText> : null}
        <AppText variant="body" color={palette.fg}>
          {message}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderRadius: radius.md, borderLeftWidth: 4 },
  text: { flex: 1, gap: spacing.xs },
});
