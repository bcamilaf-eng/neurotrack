/**
 * Gráfico de barras simple en SVG. El lector de pantalla recibe un resumen textual
 * (`summary`) en lugar del dibujo.
 */
import { StyleSheet, View } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { spacing } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

export interface BarDatum {
  label: string;
  value: number | null;
}

export interface BarChartProps {
  title: string;
  data: BarDatum[];
  summary: string;
  /** Máximo del eje; por defecto, el mayor valor. */
  max?: number;
  format?: (value: number) => string;
  height?: number;
}

const WIDTH = 320;

export function BarChart({ title, data, summary, max, format = String, height = 120 }: BarChartProps) {
  const { colors } = useAppTheme();
  const top = Math.max(max ?? 0, ...data.map((d) => d.value ?? 0), 1);
  const plot = height - 28;
  const slot = WIDTH / Math.max(data.length, 1);
  const barWidth = Math.min(28, slot * 0.6);

  return (
    <View style={styles.wrapper} accessible accessibilityRole="image" accessibilityLabel={`${title}. ${summary}`}>
      <AppText variant="label">{title}</AppText>
      <Svg width="100%" height={height} viewBox={`0 0 ${WIDTH} ${height}`}>
        <Line x1={0} x2={WIDTH} y1={plot + 4} y2={plot + 4} stroke={colors.border} strokeWidth={1} />
        {data.map((d, i) => {
          const x = i * slot + (slot - barWidth) / 2;
          const h = d.value ? Math.max(2, (d.value / top) * (plot - 14)) : 0;
          return (
            <G key={`${d.label}-${i}`}>
              {d.value ? <Rect x={x} y={plot + 4 - h} width={barWidth} height={h} rx={4} fill={colors.primary} /> : null}
              {d.value ? (
                <SvgText x={x + barWidth / 2} y={plot - h} fontSize={10} fill={colors.text} textAnchor="middle">
                  {format(d.value)}
                </SvgText>
              ) : null}
              <SvgText x={x + barWidth / 2} y={height - 4} fontSize={10} fill={colors.textMuted} textAnchor="middle">
                {d.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
      <AppText variant="caption" muted>
        {summary}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
});
