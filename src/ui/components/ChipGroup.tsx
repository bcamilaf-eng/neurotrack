import { Pressable, StyleSheet, View } from 'react-native';
import { MIN_TOUCH, radius, spacing } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

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
        {options.map((option) => {
          const on = selected.includes(option.code);
          return (
            <Pressable
              key={option.code}
              testID={testID ? `${testID}-${option.code}` : undefined}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={option.label}
              onPress={() => onToggle(option.code)}
              style={[
                styles.chip,
                { backgroundColor: on ? colors.primarySoft : colors.surface, borderColor: on ? colors.primary : colors.border },
              ]}
            >
              <AppText variant="label" color={on ? colors.primary : colors.text}>
                {on ? '✓ ' : ''}
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
  chip: { minHeight: MIN_TOUCH, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1.5, justifyContent: 'center' },
});
