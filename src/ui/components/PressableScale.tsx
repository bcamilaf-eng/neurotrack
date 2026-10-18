/**
 * Superficie táctil que cede ligeramente al pulsarla y vuelve con un muelle firme.
 * Da respuesta inmediata sin esperar a que termine la acción. Con «Reducir movimiento»
 * solo baja la opacidad.
 */
import { type ReactNode, useState } from 'react';
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { motion, useReducedMotion } from '../theme';

export interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Estilo extra mientras se pulsa (p. ej. un fondo más intenso). */
  pressedStyle?: StyleProp<ViewStyle>;
  scaleTo?: number;
}

export function PressableScale({
  style,
  pressedStyle,
  scaleTo = motion.pressScale,
  onPressIn,
  onPressOut,
  disabled,
  children,
  ...rest
}: PressableScaleProps) {
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));

  const animateTo = (value: number) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: true, ...motion.spring }).start();

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        if (!reduced) animateTo(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!reduced) animateTo(1);
        onPressOut?.(e);
      }}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            style,
            pressed && !disabled ? pressedStyle : null,
            reduced ? { opacity: pressed ? 0.8 : 1 } : { transform: [{ scale }] },
          ]}
        >
          {children}
        </Animated.View>
      )}
    </Pressable>
  );
}
