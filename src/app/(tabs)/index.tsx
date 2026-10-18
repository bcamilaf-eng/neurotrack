/** Inicio: cómo va hoy, registro rápido, resumen del mes y evolución de las últimas semanas. */
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { EPISODE_TYPES, labelOf } from '../../domain/catalogs';
import { LOCAL_MODE_NOTICE } from '../../i18n/es';
import { useSession } from '../../state/sessionStore';
import {
  AppText,
  BarChart,
  Banner,
  Card,
  Disclaimer,
  FadeIn,
  ListRow,
  Screen,
  useToast,
} from '../../ui/components';
import { QuickActions } from '../../ui/features/dashboard/QuickActions';
import { TodayCard } from '../../ui/features/dashboard/TodayCard';
import { CHART_WEEKS, useDashboard } from '../../ui/features/dashboard/useDashboard';
import { spacing } from '../../ui/theme';
import { clock } from '../../utils/clock';
import { formatDuration } from '../../utils/time';

function greeting(hour: number) {
  if (hour < 12) return 'Buenos días';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

const weekLabel = (weekStart: string) => format(parseISO(weekStart), 'd MMM', { locale: es });

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="stat">{value}</AppText>
      <AppText variant="caption" muted>
        {label}
      </AppText>
    </View>
  );
}

export default function HomeScreen() {
  const mode = useSession((s) => s.mode);
  const { data, error, markPainFree } = useDashboard();
  const toast = useToast();
  const [painFreeError, setPainFreeError] = useState<string | null>(null);
  const now = clock.now();

  const onPainFree = async () => {
    setPainFreeError(null);
    try {
      await markPainFree();
      toast.show('Día sin dolor guardado');
    } catch (e) {
      setPainFreeError(e instanceof Error ? e.message : 'No se pudo guardar.');
    }
  };

  const month = data?.month;
  const weeks = data?.weeks ?? [];
  const totalWeeks = weeks.reduce((n, w) => n + w.episodes, 0);
  const monthName = format(now, 'MMMM', { locale: es });

  return (
    <Screen>
      <AppText variant="display">
        {greeting(now.getHours())}
        {data?.name ? `, ${data.name}` : ''}
      </AppText>
      {error ? <Banner tone="danger" message={error} /> : null}

      {data ? (
        <FadeIn>
          <TodayCard data={data} />
        </FadeIn>
      ) : null}

      <FadeIn delay={60}>
        <QuickActions
          canMarkPainFree={!!data && !data.todayHasEpisode && !data.todayPainFree}
          painFreeBlockedByEpisode={!!data?.todayHasEpisode && !data.todayPainFree}
          onPainFree={onPainFree}
        />
        {painFreeError ? <Banner tone="danger" message={painFreeError} /> : null}
      </FadeIn>

      <FadeIn delay={120}>
        <Card>
          <AppText variant="heading">Resumen de {monthName}</AppText>
          <View style={styles.metrics}>
            <Metric value={month ? String(month.episodes) : '—'} label="Episodios" />
            <Metric value={month ? String(month.painDays) : '—'} label="Días con dolor" />
          </View>
          <View style={styles.metrics}>
            <Metric
              value={month?.avgIntensity != null ? `${month.avgIntensity.toLocaleString('es-ES')}/10` : '—'}
              label="Intensidad promedio"
            />
            <Metric
              value={month?.avgDurationMin != null ? formatDuration(month.avgDurationMin) : '—'}
              label="Duración promedio"
            />
          </View>
          <AppText muted>
            {data?.daysSinceLast == null
              ? 'Aún no has registrado episodios.'
              : data.daysSinceLast === 0
                ? 'Tu último episodio fue hoy.'
                : `Han pasado ${data.daysSinceLast} ${data.daysSinceLast === 1 ? 'día' : 'días'} desde tu último episodio.`}
          </AppText>
        </Card>
      </FadeIn>

      <FadeIn delay={180}>
        <Card>
          <AppText variant="heading">Últimas {CHART_WEEKS} semanas</AppText>
          <BarChart
            title="Episodios por semana"
            data={weeks.map((w) => ({ label: weekLabel(w.weekStart), value: w.episodes }))}
            summary={`${totalWeeks} ${totalWeeks === 1 ? 'episodio registrado' : 'episodios registrados'} en ${CHART_WEEKS} semanas.`}
          />
          <BarChart
            title="Intensidad promedio por semana"
            data={weeks.map((w) => ({ label: weekLabel(w.weekStart), value: w.avgIntensity }))}
            max={10}
            format={(v) => v.toLocaleString('es-ES')}
            summary="Promedio de la intensidad máxima de los episodios de cada semana, de 0 a 10."
          />
          <BarChart
            title="Duración promedio por semana (horas)"
            data={weeks.map((w) => ({
              label: weekLabel(w.weekStart),
              value: w.avgDurationMin === null ? null : Math.round((w.avgDurationMin / 60) * 10) / 10,
            }))}
            format={(v) => v.toLocaleString('es-ES')}
            summary="Solo cuenta los episodios ya terminados."
          />
        </Card>
      </FadeIn>

      {data && data.recent.length > 0 ? (
        <Card>
          <AppText variant="heading">Episodios recientes</AppText>
          <View>
            {data.recent.map((episode) => (
              <ListRow
                key={episode.id}
                title={format(parseISO(episode.startedAt), "EEEE d 'de' MMMM, HH:mm", { locale: es })}
                subtitle={`${labelOf(EPISODE_TYPES, episode.type)} · ${
                  episode.ongoing ? 'en curso' : episode.durationMin !== null ? formatDuration(episode.durationMin) : ''
                }`}
                value={`${episode.maxIntensity}/10`}
                onPress={() => router.push({ pathname: '/episodio/[id]', params: { id: episode.id } })}
              />
            ))}
          </View>
        </Card>
      ) : null}

      {mode === 'local' ? <Banner tone="info" message={LOCAL_MODE_NOTICE} /> : null}
      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', gap: spacing.lg },
  metric: { flex: 1, gap: 2 },
});
