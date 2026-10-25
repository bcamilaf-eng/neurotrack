/**
 * Estado vacío: un ícono, una frase amable y, si tiene sentido, la acción para empezar.
 * Sustituye a los textos grises sueltos («Aún no hay…»).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { radius, spacing } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Versión compacta, en línea, para dentro de una tarjeta. */
  compact?: boolean;
  testID?: string;
}

export function EmptyState({ icon, title, message, actionLabel, onAction, compact, testID }: EmptyStateProps) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.wrapper, compact && styles.compact]} testID={testID} accessible={!onAction} accessibilityLabel={[title, message].filter(Boolean).join('. ')}>
      <View style={[styles.badge, compact && styles.badgeCompact, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={compact ? 22 : 30} color={colors.primary} importantForAccessibility="no" />
      </View>
      <View style={[styles.text, compact && styles.textCompact]}>
        <AppText variant={compact ? 'label' : 'heading'} style={compact ? undefined : styles.center}>
          {title}
        </AppText>
        {message ? (
          <AppText variant="caption" muted style={compact ? undefined : styles.center}>
            {message}
          </AppText>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <View style={compact ? undefined : styles.action}>
          <Button label={actionLabel} variant="secondary" onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  compact: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: 0, gap: spacing.md },
  badge: { width: 64, height: 64, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  badgeCompact: { width: 44, height: 44 },
  text: { gap: spacing.xs, alignItems: 'center' },
  textCompact: { flex: 1, alignItems: 'flex-start' },
  center: { textAlign: 'center' },
  action: { alignSelf: 'stretch' },
});
