import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { MIN_TOUCH, radius, spacing } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

export interface CheckboxProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
  testID?: string;
}

/** Casilla con área táctil completa; el estado se indica con marca y texto, no solo con color. */
export function Checkbox({ label, description, checked, onChange, required, testID }: CheckboxProps) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={required ? `${label} (obligatorio)` : label}
      accessibilityHint={description}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.85 : 1 }]}
    >
      <View
        style={[
          styles.box,
          { borderColor: checked ? colors.primary : colors.border, backgroundColor: checked ? colors.primary : colors.surface },
        ]}
      >
        {checked ? <Ionicons name="checkmark" size={18} color={colors.onPrimary} importantForAccessibility="no" /> : null}
      </View>
      <View style={styles.text}>
        <AppText variant="label">
          {label}
          {required ? <AppText variant="label" muted> · obligatorio</AppText> : null}
        </AppText>
        {description ? (
          <AppText variant="caption" muted>
            {description}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', minHeight: MIN_TOUCH, paddingVertical: spacing.xs },
  box: { width: 26, height: 26, borderRadius: radius.sm - 2, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  text: { flex: 1, gap: 2 },
});
