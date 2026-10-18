/**
 * Entrada suave de un bloque al abrir la pantalla: sube unos pocos píxeles mientras
 * aparece. `delay` permite escalonar varios bloques. Con «Reducir movimiento» se
 * muestra directamente.
 */
import { type ReactNode, useEffect, useState } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';
import { motion, useReducedMotion } from '../theme';

export function FadeIn({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: motion.duration.slow,
      delay,
      easing: motion.easeOut,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, delay, reduced]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
