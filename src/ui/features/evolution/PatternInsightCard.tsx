import { StyleSheet, View } from 'react-native';
import { INSIGHT_LABELS, type PatternInsight } from '../../../domain/analytics/patterns';
import { AppText, Card } from '../../components';
import { radius, spacing } from '../../theme';
import { useAppTheme } from '../../theme/ThemeContext';

/** Tarjeta de un patrón con su etiqueta: dato registrado, asociación estadística o interpretación. */
export function PatternInsightCard({ insight }: { insight: PatternInsight }) {
  const { colors } = useAppTheme();
  const association = insight.kind === 'association';
  return (
    <Card>
      <View style={[styles.badge, { backgroundColor: association ? colors.warningSoft : colors.surfaceMuted }]}>
        <AppText variant="caption" color={association ? colors.warning : colors.textMuted}>
          {INSIGHT_LABELS[insight.kind]}
        </AppText>
      </View>
      <AppText variant="label">{insight.title}</AppText>
      <AppText>{insight.text}</AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
});
