/**
 * Calendario mensual con una marca por día. Cada categoría combina forma, símbolo y
 * color, y el lector de pantalla recibe la descripción completa del día.
 */
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Pressable, StyleSheet, View } from 'react-native';
import { type DayCategory, DAY_CATEGORY_LABELS, type DayMark } from '../../../domain/analytics/calendar';
import { AppText } from '../../components';
import type { Palette } from '../../theme';
import { MIN_TOUCH, radius, spacing } from '../../theme';
import { useAppTheme } from '../../theme/ThemeContext';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const WEEKDAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

/** Símbolo, color y forma de cada categoría. */
export function markerStyle(category: DayCategory, colors: Palette) {
  switch (category) {
    case 'intense':
      return { symbol: '!', fill: colors.danger, text: colors.onPrimary, border: colors.danger, round: true };
    case 'migraine':
      return { symbol: 'M', fill: colors.primary, text: colors.onPrimary, border: colors.primary, round: true };
    case 'headache':
      return { symbol: 'C', fill: 'transparent', text: colors.primary, border: colors.primary, round: true };
    case 'painFree':
      return { symbol: '✓', fill: 'transparent', text: colors.success, border: 'transparent', round: false };
    default:
      return null;
  }
}

export function describeDay(mark: DayMark): string {
  const parts = [format(parseISO(mark.date), "EEEE d 'de' MMMM", { locale: es }), DAY_CATEGORY_LABELS[mark.category]];
  if (mark.maxIntensity !== null) parts.push(`intensidad máxima ${mark.maxIntensity} de 10`);
  if (mark.episodes > 1) parts.push(`${mark.episodes} episodios`);
  if (mark.medication) parts.push('medicación registrada');
  return parts.join(', ');
}

export interface NeuroCalendarProps {
  marks: DayMark[];
  blanks: number;
  selected: string | null;
  today: string;
  onSelect: (date: string) => void;
}

export function NeuroCalendar({ marks, blanks, selected, today, onSelect }: NeuroCalendarProps) {
  const { colors } = useAppTheme();
  const cells: (DayMark | null)[] = [...Array<null>(blanks).fill(null), ...marks];
  while (cells.length % 7) cells.push(null);
  const rows = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  return (
    <View style={styles.wrapper}>
      <View style={styles.row} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {WEEKDAYS.map((d, i) => (
          <View key={WEEKDAY_NAMES[i]} style={styles.cell}>
            <AppText variant="caption" muted>
              {d}
            </AppText>
          </View>
        ))}
      </View>
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((mark, c) => {
            if (!mark) return <View key={`blank-${r}-${c}`} style={styles.cell} />;
            const marker = markerStyle(mark.category, colors);
            const isSelected = mark.date === selected;
            const future = mark.date > today;
            return (
              <Pressable
                key={mark.date}
                testID={`day-${mark.date}`}
                accessibilityRole="button"
                accessibilityLabel={describeDay(mark)}
                accessibilityState={{ selected: isSelected, disabled: future }}
                disabled={future}
                onPress={() => onSelect(mark.date)}
                style={[
                  styles.cell,
                  styles.day,
                  {
                    borderColor: isSelected ? colors.focus : mark.date === today ? colors.border : 'transparent',
                    borderWidth: isSelected ? 2 : 1,
                    opacity: future ? 0.4 : 1,
                  },
                ]}
              >
                <AppText variant="caption">{Number(mark.date.slice(8))}</AppText>
                <View style={styles.markerSlot}>
                  {marker ? (
                    <View
                      style={[
                        styles.marker,
                        { backgroundColor: marker.fill, borderColor: marker.border, borderRadius: marker.round ? 10 : 0 },
                      ]}
                    >
                      <AppText variant="caption" color={marker.text} style={styles.symbol}>
                        {marker.symbol}
                      </AppText>
                    </View>
                  ) : null}
                </View>
                <View style={[styles.pill, { backgroundColor: mark.medication ? colors.accent : 'transparent' }]} />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** Leyenda con las mismas formas que el calendario. */
export function CalendarLegend() {
  const { colors } = useAppTheme();
  const items: DayCategory[] = ['painFree', 'headache', 'migraine', 'intense'];
  return (
    <View style={styles.legend}>
      {items.map((category) => {
        const marker = markerStyle(category, colors)!;
        return (
          <View key={category} style={styles.legendItem}>
            <View style={[styles.marker, { backgroundColor: marker.fill, borderColor: marker.border, borderRadius: marker.round ? 10 : 0 }]}>
              <AppText variant="caption" color={marker.text} style={styles.symbol}>
                {marker.symbol}
              </AppText>
            </View>
            <AppText variant="caption">{DAY_CATEGORY_LABELS[category]}</AppText>
          </View>
        );
      })}
      <View style={styles.legendItem}>
        <View style={[styles.pill, { backgroundColor: colors.accent }]} />
        <AppText variant="caption">Medicación utilizada</AppText>
      </View>
      <AppText variant="caption" muted>
        Episodio intenso: intensidad máxima de 7 o más. La categoría es la que tú registraste, no un diagnóstico.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 2 },
  row: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 24 },
  day: { minHeight: MIN_TOUCH + 12, borderRadius: radius.sm, paddingVertical: 2, gap: 1 },
  markerSlot: { height: 20, justifyContent: 'center' },
  marker: { width: 20, height: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  symbol: { fontWeight: '700', lineHeight: 16 },
  pill: { width: 16, height: 4, borderRadius: 2 },
  legend: { gap: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
