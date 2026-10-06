/**
 * Gráfico de línea simple en SVG. Los tramos sin dato cortan la línea en lugar de
 * inventar valores. El lector de pantalla recibe el resumen textual.
 */
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { spacing } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import type { BarDatum } from './BarChart';

export interface LineChartProps {
  title: string;
  data: BarDatum[];
  summary: string;
  max: number;
  height?: number;
}

const WIDTH = 320;

export function LineChart({ title, data, summary, max, height = 120 }: LineChartProps) {
  const { colors } = useAppTheme();
  const plot = height - 24;
  const slot = WIDTH / Math.max(data.length, 1);
  const x = (i: number) => i * slot + slot / 2;
  const y = (v: number) => 8 + (1 - v / max) * (plot - 8);
  // Segmentos continuos de puntos con valor.
  const segments: { i: number; v: number }[][] = [];
  let current: { i: number; v: number }[] = [];
  data.forEach((d, i) => {
    if (d.value === null) {
      if (current.length) segments.push(current);
      current = [];
    } else current.push({ i, v: d.value });
  });
  if (current.length) segments.push(current);
  // Etiquetas del eje: como mucho 8 para que no se pisen.
  const every = Math.ceil(data.length / 8);

  return (
    <View style={styles.wrapper} accessible accessibilityRole="image" accessibilityLabel={`${title}. ${summary}`}>
      <AppText variant="label">{title}</AppText>
      <Svg width="100%" height={height} viewBox={`0 0 ${WIDTH} ${height}`}>
        <Line x1={0} x2={WIDTH} y1={y(0)} y2={y(0)} stroke={colors.border} strokeWidth={1} />
        <Line x1={0} x2={WIDTH} y1={y(max)} y2={y(max)} stroke={colors.border} strokeWidth={1} strokeDasharray="4 4" />
        {segments.map((segment) => (
          <Polyline
            key={segment[0].i}
            points={segment.map((p) => `${x(p.i)},${y(p.v)}`).join(' ')}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2.5}
          />
        ))}
        {segments.flat().map((p) => (
          <Circle key={p.i} cx={x(p.i)} cy={y(p.v)} r={3.5} fill={colors.primary} />
        ))}
        {data.map((d, i) =>
          i % every === 0 ? (
            <SvgText key={`${d.label}-${i}`} x={x(i)} y={height - 4} fontSize={10} fill={colors.textMuted} textAnchor="middle">
              {d.label}
            </SvgText>
          ) : null,
        )}
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
