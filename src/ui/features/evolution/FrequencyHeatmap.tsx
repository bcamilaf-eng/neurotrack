/**
 * Calendario de frecuencia: una casilla por día (semanas en columnas, de lunes a domingo),
 * coloreada según la intensidad máxima registrada. El resumen textual sustituye al dibujo
 * para el lector de pantalla.
 */
import { getISODay, parseISO } from 'date-fns';
import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { AppText } from '../../components';
import { spacing } from '../../theme';
import { useAppTheme } from '../../theme/ThemeContext';
import { painColor } from '../episode/PainScale';

export interface FrequencyHeatmapProps {
  days: { date: string; intensity: number | null }[];
  summary: string;
}

export function FrequencyHeatmap({ days, summary }: FrequencyHeatmapProps) {
  const { colors, dark } = useAppTheme();
  if (days.length === 0) return null;
  const offset = getISODay(parseISO(days[0].date)) - 1;
  const columns = Math.ceil((days.length + offset) / 7);
  const cell = Math.min(18, Math.floor(320 / columns) - 2);
  const gap = 2;
  const width = columns * (cell + gap);
  const height = 7 * (cell + gap);
  return (
    <View style={styles.wrapper} accessible accessibilityRole="image" accessibilityLabel={`Calendario de frecuencia. ${summary}`}>
      <AppText variant="label">Calendario de frecuencia</AppText>
      <Svg width="100%" height={Math.max(height, 60)} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMinYMin meet">
        {days.map((d, i) => {
          const index = i + offset;
          return (
            <Rect
              key={d.date}
              x={Math.floor(index / 7) * (cell + gap)}
              y={(index % 7) * (cell + gap)}
              width={cell}
              height={cell}
              rx={2}
              fill={d.intensity === null ? colors.surfaceMuted : painColor(d.intensity, dark)}
            />
          );
        })}
      </Svg>
      <AppText variant="caption" muted>
        {summary} Cada casilla es un día (filas de lunes a domingo); el color va de verde (leve) a rojo (intenso), gris sin dolor.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
});
