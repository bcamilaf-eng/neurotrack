/**
 * Evolución reciente: intensidad máxima de cada día en la última semana o el último mes,
 * con un resumen corto del período elegido.
 */
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { DayPoint } from '../../../domain/analytics/summary';
import { AppText, Card, DayBars, SegmentedControl } from '../../components';
import { spacing } from '../../theme';
import { useAppTheme } from '../../theme/ThemeContext';

type Range = 'week' | 'month';
const RANGES = [
  { code: 'week', label: 'Semana' },
  { code: 'month', label: 'Mes' },
] as const;

function Stat({ value, label, period }: { value: string; label: string; period: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label} en ${period}: ${value}`}>
      <AppText variant="heading">{value}</AppText>
      <AppText variant="caption" muted>
        {label}
      </AppText>
    </View>
  );
}

export function TrendCard({ daily }: { daily: DayPoint[] }) {
  const { colors } = useAppTheme();
  const [range, setRange] = useState<Range>('week');
  const days = range === 'week' ? daily.slice(-7) : daily.slice(-30);

  const pain = days.filter((d) => d.maxIntensity !== null);
  const peak = pain.length ? Math.max(...pain.map((d) => d.maxIntensity as number)) : null;
  const average = pain.length
    ? Math.round((pain.reduce((n, d) => n + (d.maxIntensity as number), 0) / pain.length) * 10) / 10
    : null;
  const period = range === 'week' ? 'los últimos 7 días' : 'los últimos 30 días';

  const bars = days.map((d, i) => {
    const date = parseISO(d.date);
    const label =
      range === 'week'
        ? format(date, 'EEEEE', { locale: es }).toUpperCase()
        : i % 5 === 4 || i === days.length - 1
          ? format(date, 'd')
          : '';
    return { key: d.date, label, value: d.maxIntensity };
  });

  const summary =
    pain.length === 0
      ? `Sin dolor registrado en ${period}.`
      : `${pain.length} ${pain.length === 1 ? 'día con dolor' : 'días con dolor'} en ${period}. Intensidad máxima ${peak} de 10.`;

  return (
    <Card>
      <View style={styles.header}>
        <AppText variant="heading">Tu evolución</AppText>
        <AppText variant="caption" muted>
          Intensidad máxima de cada día (0–10)
        </AppText>
      </View>
      <SegmentedControl label="Período del gráfico" options={RANGES} value={range} onChange={setRange} testID="trend-range" />
      <View style={styles.stats}>
        <Stat value={String(pain.length)} label="Días con dolor" period={period} />
        <Stat value={String(days.length - pain.length)} label="Días sin dolor" period={period} />
        <Stat value={average === null ? '—' : `${average.toLocaleString('es-ES')}`} label="Intensidad media" period={period} />
      </View>
      <DayBars data={bars} summary={summary} />
      <View style={styles.legend}>
        <View style={[styles.swatch, { backgroundColor: colors.primary }]} />
        <AppText variant="caption" muted>
          Día con dolor
        </AppText>
        <View style={[styles.dot, { backgroundColor: colors.accent }]} />
        <AppText variant="caption" muted>
          Sin dolor registrado
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { gap: 2 },
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, gap: 2 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: spacing.md },
});
