import { StyleSheet, View } from 'react-native';
import { spacing } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { Chip } from './Chip';

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
            <Chip
              key={option.code}
              role="radio"
              label={option.label}
              selected={selected}
              onPress={() => onChange(selected && allowClear ? undefined : option.code)}
            />
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
});
