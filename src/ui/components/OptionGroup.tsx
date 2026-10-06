import { Pressable, StyleSheet, View } from 'react-native';
import { MIN_TOUCH, radius, spacing } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

export interface OptionGroupProps<K extends string> {
  label: string;
  options: readonly { code: K; label: string }[];
  value: K | undefined;
  onChange: (value: K | undefined) => void;
  /** Permite desmarcar la opción elegida (campos opcionales). */
  allowClear?: boolean;
  error?: string;
}

/** Selección única con chips grandes; la opción elegida lleva marca ✓ además del color. */
export function OptionGroup<K extends string>({ label, options, value, onChange, allowClear, error }: OptionGroupProps<K>) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.wrapper} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <AppText variant="label">{label}</AppText>
      <View style={styles.chips}>
        {options.map((option) => {
          const selected = option.code === value;
          return (
            <Pressable
              key={option.code}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => onChange(selected && allowClear ? undefined : option.code)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? colors.primarySoft : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <AppText variant="label" color={selected ? colors.primary : colors.text}>
                {selected ? '✓ ' : ''}
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
});
