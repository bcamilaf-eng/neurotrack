/**
 * Movimiento: breve, con salida suave y sin rebotes exagerados. Sirve para dar
 * respuesta inmediata (un botón que cede al tocarlo, un aviso que aparece), nunca
 * para decorar. Si el sistema pide reducir el movimiento, se sustituye por cambios
 * de opacidad o instantáneos.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Easing } from 'react-native';

export const motion = {
  duration: { fast: 120, base: 220, slow: 360 },
  /** Curva de salida rápida y aterrizaje suave. */
  easeOut: Easing.bezier(0.23, 1, 0.32, 1),
  /** Muelle firme para respuestas al tacto. */
  spring: { damping: 18, stiffness: 260, mass: 1 },
  /** Cuánto cede un elemento al pulsarlo. */
  pressScale: 0.97,
} as const;

/** Preferencia del sistema «Reducir movimiento». */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduced(value);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
  return reduced;
}
