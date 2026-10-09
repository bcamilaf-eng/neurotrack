/**
 * Anillo de progreso en SVG con el porcentaje en el centro. El lector de pantalla
 * recibe el resumen textual en lugar del dibujo.
 */
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useAppTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

export interface ProgressRingProps {
  /** Progreso entre 0 y 1. */
  progress: number;
  label: string;
  caption?: string;
  size?: number;
}

export function ProgressRing({ progress, label, caption, size = 140 }: ProgressRingProps) {
  const { colors } = useAppTheme();
  const clamped = Math.max(0, Math.min(1, progress));
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const percent = Math.round(clamped * 100);
  return (
    <View
      style={[styles.wrapper, { width: size, height: size }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${label}: ${percent} %${caption ? `, ${caption}` : ''}`}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.border} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.accent}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <AppText variant="title">{percent} %</AppText>
        {caption ? (
          <AppText variant="caption" muted>
            {caption}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center' },
});
