import { StyleSheet, View } from 'react-native';
import { spacing } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { Chip } from './Chip';

export interface ChipGroupProps<K extends string> {
  label: string;
  hint?: string;
  options: readonly { code: K; label: string }[];
  selected: readonly K[];
  onToggle: (code: K) => void;
  error?: string;
  testID?: string;
}

/** Selección múltiple con chips grandes. Lo seleccionado lleva ✓, no solo color. */
export function ChipGroup<K extends string>({ label, hint, options, selected, onToggle, error, testID }: ChipGroupProps<K>) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.wrapper} testID={testID}>
      <AppText variant="label">{label}</AppText>
      {hint ? (
        <AppText variant="caption" muted>
          {hint}
        </AppText>
      ) : null}
      <View style={styles.chips}>
        {options.map((option) => (
          <Chip
            key={option.code}
            testID={testID ? `${testID}-${option.code}` : undefined}
            role="checkbox"
            label={option.label}
            selected={selected.includes(option.code)}
            onPress={() => onToggle(option.code)}
          />
        ))}
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
