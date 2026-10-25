/**
 * Barras por día de intensidad (0–10). Las barras crecen desde la base al aparecer o
 * al cambiar de período; los días sin dolor llevan una marca esmeralda. El lector de
 * pantalla recibe el resumen textual en lugar del dibujo.
 */
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { motion, radius, spacing, useReducedMotion } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

export interface DayBar {
  key: string;
  /** Etiqueta bajo la barra; vacía para no saturar el eje. */
  label: string;
  value: number | null;
}

const HEIGHT = 140;

export function DayBars({ data, summary, max = 10 }: { data: DayBar[]; summary: string; max?: number }) {
  const { colors } = useAppTheme();
  const reduced = useReducedMotion();
  const [grow] = useState(() => new Animated.Value(0));
  const signature = data.map((d) => `${d.key}:${d.value ?? '-'}`).join('|');

  useEffect(() => {
    if (reduced) {
      grow.setValue(1);
      return;
    }
    grow.setValue(0);
    const animation = Animated.timing(grow, {
      toValue: 1,
      duration: motion.duration.slow,
      easing: motion.easeOut,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [grow, reduced, signature]);

  const thin = data.length > 14;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={summary} style={styles.wrapper}>
      <View style={[styles.plot, { borderBottomColor: colors.border }]}>
        {[0.5, 1].map((level) => (
          <View
            key={level}
            style={[styles.grid, { bottom: HEIGHT * level - 1, borderTopColor: colors.border }]}
            pointerEvents="none"
          />
        ))}
        {data.map((d) => {
          const ratio = d.value ? Math.max(0.04, d.value / max) : 0;
          return (
            <View key={d.key} style={styles.column}>
              {d.value ? (
                <Animated.View
                  style={[
                    {
                      height: HEIGHT * ratio,
                      borderRadius: thin ? 3 : radius.sm - 4,
                      width: thin ? '70%' : '56%',
                      backgroundColor: d.value >= 7 ? colors.primaryPressed : colors.primary,
                      opacity: d.value >= 7 ? 1 : 0.55 + (d.value / max) * 0.45,
                      transformOrigin: 'bottom',
                      transform: [{ scaleY: grow }],
                    },
                  ]}
                />
              ) : (
                <View style={[styles.dot, { backgroundColor: colors.accent }]} />
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {data.map((d) => (
          <View key={d.key} style={styles.labelCell}>
            <AppText variant="caption" muted style={styles.label} numberOfLines={1}>
              {d.label}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  plot: { height: HEIGHT, flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1 },
  grid: { position: 'absolute', left: 0, right: 0, borderTopWidth: StyleSheet.hairlineWidth, borderStyle: 'dashed' },
  column: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  dot: { width: 5, height: 5, borderRadius: 3, marginBottom: 4 },
  labels: { flexDirection: 'row' },
  labelCell: { flex: 1, alignItems: 'center', overflow: 'visible' },
  // Más ancha que su columna para que las fechas del mes no se corten.
  label: { width: 32, textAlign: 'center', fontSize: 12 },
});
