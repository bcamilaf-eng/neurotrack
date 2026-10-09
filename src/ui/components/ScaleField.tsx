/**
 * Escala numérica (1–5, 1–10…) con botones grandes. Muestra el valor elegido con su
 * etiqueta en texto, para que no dependa solo del color.
 */
import { Pressable, StyleSheet, View } from 'react-native';
import { MIN_TOUCH, radius, spacing } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

export interface ScaleFieldProps {
  label: string;
  min: number;
  max: number;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  /** Etiqueta de cada valor, de `min` a `max`. */
  labels?: readonly string[];
  /** Texto bajo la escala que explica sus extremos (p. ej. «1 nada · 10 máximo»). */
  hint?: string;
  /** Permite desmarcar el valor elegido (campos opcionales). */
  allowClear?: boolean;
  error?: string;
  testID?: string;
}

export function ScaleField({ label, min, max, value, onChange, labels, hint, allowClear, error, testID }: ScaleFieldProps) {
  const { colors } = useAppTheme();
  const levels = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const describe = (level: number) => (labels ? `${level}, ${labels[level - min]}` : String(level));
  return (
    <View style={styles.wrapper} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <AppText variant="label">{label}</AppText>
      <View style={styles.row}>
        {levels.map((level) => {
          const selected = value === level;
          return (
            <Pressable
              key={level}
              testID={testID ? `${testID}-${level}` : undefined}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={describe(level)}
              onPress={() => onChange(selected && allowClear ? undefined : level)}
              style={[
                styles.cell,
                {
                  backgroundColor: selected ? colors.primary : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <AppText variant="label" color={selected ? colors.onPrimary : colors.text}>
                {level}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <AppText variant="caption" muted accessibilityLiveRegion="polite">
        {value === undefined ? (hint ?? `Elige de ${min} a ${max}.`) : `${value} de ${max}${labels ? ` · ${labels[value - min]}` : ''}`}
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
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
