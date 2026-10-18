import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet } from 'react-native';
import { MIN_TOUCH, radius, spacing } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

export interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** `radio` para selección única, `checkbox` para múltiple. */
  role: 'radio' | 'checkbox';
  testID?: string;
}

/** Chip grande y táctil. Lo elegido lleva una marca además del color. */
export function Chip({ label, selected, onPress, role, testID }: ChipProps) {
  const { colors } = useAppTheme();
  return (
    <PressableScale
      testID={testID}
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { selected } : { checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primarySoft : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
      pressedStyle={{ backgroundColor: colors.surfaceMuted }}
    >
      {selected ? <Ionicons name="checkmark" size={16} color={colors.primary} importantForAccessibility="no" /> : null}
      <AppText variant="label" color={selected ? colors.primary : colors.text}>
        {label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
