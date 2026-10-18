/**
 * Confirmación breve tras una acción («Episodio guardado»). Aparece deslizándose desde
 * abajo, se anuncia al lector de pantalla y se va sola. No sustituye a los errores en
 * pantalla: es solo feedback inmediato.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { elevation, motion, radius, spacing, useReducedMotion } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

export type ToastTone = 'success' | 'info' | 'error';

interface ToastMessage {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastApi {
  show(message: string, tone?: ToastTone): void;
}

const ToastContext = createContext<ToastApi>({ show: () => undefined });

const VISIBLE_MS = 2600;
const ICON = { success: 'checkmark-circle', info: 'information-circle', error: 'alert-circle' } as const;

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const counter = useRef(0);
  const show = useCallback((message: string, tone: ToastTone = 'success') => {
    counter.current += 1;
    setToast({ id: counter.current, message, tone });
    AccessibilityInfo.announceForAccessibility(message);
  }, []);
  const api = useMemo(() => ({ show }), [show]);
  const clear = useCallback(() => setToast(null), []);

  return (
    <ToastContext.Provider value={api}>
      <View style={styles.fill}>
        {children}
        {toast ? <ToastView key={toast.id} toast={toast} onDone={clear} /> : null}
      </View>
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onDone }: { toast: ToastMessage; onDone: () => void }) {
  const { colors, dark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const appear = Animated.timing(progress, {
      toValue: 1,
      duration: reduced ? 0 : motion.duration.base,
      easing: motion.easeOut,
      useNativeDriver: true,
    });
    const disappear = Animated.timing(progress, {
      toValue: 0,
      duration: reduced ? 0 : motion.duration.fast,
      delay: VISIBLE_MS,
      useNativeDriver: true,
    });
    const sequence = Animated.sequence([appear, disappear]);
    sequence.start(({ finished }) => {
      if (finished) onDone();
    });
    return () => sequence.stop();
  }, [progress, reduced, onDone]);

  const tint = { success: colors.success, info: colors.primary, error: colors.danger }[toast.tone];
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        { bottom: insets.bottom + 84, backgroundColor: colors.surface, borderColor: colors.border },
        elevation(colors, dark, 2),
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        },
      ]}
    >
      <Ionicons name={ICON[toast.tone]} size={22} color={tint} importantForAccessibility="no" />
      <AppText variant="label" style={styles.text}>
        {toast.message}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1 },
});
