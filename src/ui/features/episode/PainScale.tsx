/**
 * Escala visual de dolor 0–10. Cada valor muestra su número y la banda
 * (Sin dolor, Leve, Moderado, Intenso, Máximo) en texto, no solo en color.
 */
import { Pressable, StyleSheet, View } from 'react-native';
import { painBand } from '../../../domain/catalogs';
import { AppText } from '../../components';
import { MIN_TOUCH, radius, spacing } from '../../theme';
import { readableOn } from '../../theme/contrast';
import { useAppTheme } from '../../theme/ThemeContext';

const LEVELS = Array.from({ length: 11 }, (_, i) => i);

/** Tono de cada nivel, de calma (0) a máximo (10). Es un apoyo visual: el texto manda. */
export function painColor(level: number, dark: boolean): string {
  const light = ['#1E7A3E', '#357A30', '#5C9636', '#7A9A2E', '#9A8F22', '#B07A1A', '#A95610', '#C24E16', '#BD3A18', '#AF2B1D', '#951F22'];
  const night = ['#7BD99A', '#94D98A', '#ADD77B', '#C7D46E', '#DCCB66', '#EDBB62', '#F6A660', '#FA915F', '#FC7E62', '#FD6D6A', '#FF6075'];
  return (dark ? night : light)[level];
}

export interface PainScaleProps {
  value: number | undefined;
  onChange: (value: number) => void;
  error?: string;
  label?: string;
}

export function PainScale({ value, onChange, error, label = 'Intensidad del dolor' }: PainScaleProps) {
  const { colors, dark } = useAppTheme();
  return (
    <View style={styles.wrapper} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <AppText variant="label">{label}</AppText>
      <View style={styles.grid}>
        {LEVELS.map((level) => {
          const selected = value === level;
          const tone = painColor(level, dark);
          return (
            <Pressable
              key={level}
              testID={`pain-${level}`}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${level}, ${painBand(level)}`}
              onPress={() => onChange(level)}
              style={[
                styles.cell,
                {
                  borderColor: selected ? tone : colors.border,
                  backgroundColor: selected ? tone : colors.surface,
                  borderWidth: selected ? 2 : 1,
                },
              ]}
            >
              <AppText variant="heading" color={selected ? readableOn(tone) : colors.text}>
                {level}
              </AppText>
              <View style={[styles.tick, { backgroundColor: tone }]} />
            </Pressable>
          );
        })}
      </View>
      <AppText variant="body" accessibilityLiveRegion="polite">
        {value === undefined ? 'Toca un número de 0 a 10.' : `${value}/10 · ${painBand(value)}`}
      </AppText>
      <AppText variant="caption" muted>
        0 sin dolor · 1–3 leve · 4–6 moderado · 7–9 intenso · 10 máximo dolor imaginable
      </AppText>
      {error ? (
        <AppText variant="caption" color={colors.danger} accessibilityRole="alert">
          ⚠ {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: {
    width: MIN_TOUCH + 4,
    height: MIN_TOUCH + 4,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tick: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 4 },
});
