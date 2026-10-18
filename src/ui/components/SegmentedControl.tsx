/**
 * Selector de pocas opciones excluyentes (p. ej. Semana / Mes). El indicador se desliza
 * hasta la opción elegida; con «Reducir movimiento» salta sin animación.
 */
import { useEffect, useState } from 'react';
import { Animated, type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { elevation, MIN_TOUCH, motion, radius, spacing, useReducedMotion } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

export interface SegmentedControlProps<K extends string> {
  label: string;
  options: readonly { code: K; label: string }[];
  value: K;
  onChange: (value: K) => void;
  testID?: string;
}

const PAD = 4;

export function SegmentedControl<K extends string>({ label, options, value, onChange, testID }: SegmentedControlProps<K>) {
  const { colors, dark } = useAppTheme();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.code === value));
  const segment = width > 0 ? (width - PAD * 2) / options.length : 0;
  const [x] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const target = index * segment;
    if (reduced || segment === 0) x.setValue(target);
    else Animated.timing(x, { toValue: target, duration: motion.duration.base, easing: motion.easeOut, useNativeDriver: true }).start();
  }, [index, segment, reduced, x]);

  return (
    <View
      testID={testID}
      accessibilityRole="tablist"
      accessibilityLabel={label}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.track, { backgroundColor: colors.surfaceMuted }]}
    >
      {segment > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.thumb,
            { width: segment, backgroundColor: colors.surface, transform: [{ translateX: x }] },
            elevation(colors, dark),
          ]}
        />
      ) : null}
      {options.map((option) => {
        const selected = option.code === value;
        return (
          <Pressable
            key={option.code}
            testID={testID ? `${testID}-${option.code}` : undefined}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.code)}
            style={styles.option}
          >
            <AppText variant="label" color={selected ? colors.text : colors.textMuted}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: radius.md, padding: PAD },
  thumb: { position: 'absolute', top: PAD, bottom: PAD, left: PAD, borderRadius: radius.md - PAD },
  option: { flex: 1, minHeight: MIN_TOUCH - PAD * 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
});
