import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import { radius, spacing } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

export interface BannerProps {
  tone: 'info' | 'warning' | 'danger';
  title?: string;
  message: string;
}

const ICON = { info: 'information-circle', warning: 'warning', danger: 'alert-circle' } as const;
const PREFIX = { info: 'Información', warning: 'Atención', danger: 'Importante' } as const;

/** Aviso destacado. El tipo se comunica con icono y texto además del color. */
export function Banner({ tone, title, message }: BannerProps) {
  const { colors } = useAppTheme();
  const palette = {
    info: { bg: colors.primarySoft, edge: colors.primary },
    warning: { bg: colors.warningSoft, edge: colors.warning },
    danger: { bg: colors.dangerSoft, edge: colors.danger },
  }[tone];
  return (
    <View
      accessibilityRole={tone === 'info' ? 'summary' : 'alert'}
      accessibilityLabel={`${PREFIX[tone]}. ${title ? `${title}. ` : ''}${message}`}
      style={[styles.banner, { backgroundColor: palette.bg }]}
    >
      <Ionicons name={ICON[tone]} size={22} color={palette.edge} importantForAccessibility="no" />
      <View style={styles.text}>
        {title ? <AppText variant="label">{title}</AppText> : null}
        <AppText variant="body" color={colors.text}>
          {message}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderRadius: radius.md },
  text: { flex: 1, gap: spacing.xs },
});
