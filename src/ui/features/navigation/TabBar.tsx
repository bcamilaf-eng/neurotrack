/**
 * Barra inferior flotante: cuatro pestañas y, en el centro, el botón de registrar.
 * - Una píldora de fondo se desliza hasta la pestaña activa y su ícono crece un poco.
 * - El botón central cede al pulsarlo y su «+» gira.
 * Con «Reducir movimiento» todo cambia sin animación.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Tabs } from 'expo-router';
import { type ComponentProps, useEffect, useState } from 'react';
import { Animated, type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../components';
import { elevation, motion, radius, spacing, useReducedMotion } from '../../theme';
import { useAppTheme } from '../../theme/ThemeContext';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
type IconName = ComponentProps<typeof Ionicons>['name'];

const CENTER = 'registrar';
export const TAB_ITEMS: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', title: 'Inicio', icon: 'home-outline', iconActive: 'home' },
  { name: 'calendario', title: 'Calendario', icon: 'calendar-outline', iconActive: 'calendar' },
  { name: CENTER, title: 'Registrar', icon: 'add', iconActive: 'add' },
  { name: 'evolucion', title: 'Evolución', icon: 'stats-chart-outline', iconActive: 'stats-chart' },
  { name: 'comunidad', title: 'Comunidad', icon: 'people-outline', iconActive: 'people' },
];

const BAR_HEIGHT = 64;
const PILL_INSET = 8;

function TabButton({
  item,
  focused,
  onPress,
}: {
  item: (typeof TAB_ITEMS)[number];
  focused: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(focused ? 1.12 : 1));
  useEffect(() => {
    const to = focused ? 1.12 : 1;
    if (reduced) scale.setValue(to);
    else Animated.spring(scale, { toValue: to, useNativeDriver: true, ...motion.spring }).start();
  }, [focused, reduced, scale]);
  const color = focused ? colors.primary : colors.textMuted;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={item.title}
      testID={`tab-${item.name}`}
      onPress={onPress}
      style={styles.tab}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name={focused ? item.iconActive : item.icon} size={22} color={color} importantForAccessibility="no" />
      </Animated.View>
      <AppText variant="caption" color={color} style={styles.label} numberOfLines={1} maxFontSizeMultiplier={1.2}>
        {item.title}
      </AppText>
    </Pressable>
  );
}

function CenterButton({ focused, onPress }: { focused: boolean; onPress: () => void }) {
  const { colors, dark } = useAppTheme();
  const reduced = useReducedMotion();
  const [press] = useState(() => new Animated.Value(0));
  const [spin] = useState(() => new Animated.Value(0));

  const animate = (value: Animated.Value, toValue: number) =>
    Animated.spring(value, { toValue, useNativeDriver: true, ...motion.spring }).start();

  return (
    <View style={styles.tab}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Registrar"
        accessibilityHint="Abre el menú para registrar un episodio, medicación o hábitos"
        accessibilityState={{ selected: focused }}
        testID="tab-registrar"
        onPressIn={() => !reduced && animate(press, 1)}
        onPressOut={() => !reduced && animate(press, 0)}
        onPress={() => {
          if (!reduced) {
            spin.setValue(0);
            Animated.timing(spin, { toValue: 1, duration: motion.duration.slow, easing: motion.easeOut, useNativeDriver: true }).start();
          }
          onPress();
        }}
        hitSlop={8}
      >
        <Animated.View
          style={[
            styles.center,
            { backgroundColor: colors.primary, borderColor: colors.background },
            elevation(colors, dark, 2),
            { transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] }) }] },
          ]}
        >
          <Animated.View style={{ transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }] }}>
            <Ionicons name="add" size={32} color={colors.onPrimary} importantForAccessibility="no" />
          </Animated.View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

export function NeuroTabBar({ state, navigation, insets }: TabBarProps) {
  const { colors, dark } = useAppTheme();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [x] = useState(() => new Animated.Value(0));
  const [pillOpacity] = useState(() => new Animated.Value(0));

  const focusedName = state.routes[state.index]?.name;
  const focusedSlot = TAB_ITEMS.findIndex((t) => t.name === focusedName);
  const slot = width / TAB_ITEMS.length;
  const showPill = focusedSlot >= 0 && focusedName !== CENTER;

  useEffect(() => {
    if (!slot) return;
    const target = Math.max(0, focusedSlot) * slot + PILL_INSET;
    if (reduced) {
      x.setValue(target);
      pillOpacity.setValue(showPill ? 1 : 0);
      return;
    }
    Animated.parallel([
      Animated.spring(x, { toValue: target, useNativeDriver: true, damping: 20, stiffness: 220, mass: 1 }),
      Animated.timing(pillOpacity, { toValue: showPill ? 1 : 0, duration: motion.duration.fast, useNativeDriver: true }),
    ]).start();
  }, [focusedSlot, slot, showPill, reduced, x, pillOpacity]);

  const go = (name: string) => {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (focusedName !== name && !event.defaultPrevented) navigation.navigate(route.name, route.params);
  };

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, spacing.sm) + spacing.xs, backgroundColor: colors.background }]}>
      <View
        accessibilityRole="tablist"
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.border }, elevation(colors, dark, 2)]}
      >
        {slot ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pill,
              { width: slot - PILL_INSET * 2, backgroundColor: colors.primarySoft, opacity: pillOpacity, transform: [{ translateX: x }] },
            ]}
          />
        ) : null}
        {TAB_ITEMS.map((item) =>
          item.name === CENTER ? (
            <CenterButton key={item.name} focused={focusedName === CENTER} onPress={() => go(item.name)} />
          ) : (
            <TabButton key={item.name} item={item} focused={focusedName === item.name} onPress={() => go(item.name)} />
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: BAR_HEIGHT,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pill: { position: 'absolute', left: 0, top: PILL_INSET, bottom: PILL_INSET, borderRadius: radius.lg },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, height: '100%' },
  label: { fontSize: 10, lineHeight: 13 },
  center: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    borderWidth: 4,
  },
});
