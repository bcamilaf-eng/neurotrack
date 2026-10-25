/** Inicio: cómo va hoy, registro rápido, resumen del mes y evolución de la última semana o el último mes. */
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
  Banner,
  Card,
  Disclaimer,
  FadeIn,
  ListRow,
  Screen,
  useToast,
} from '../../ui/components';
import { ProfileButton } from '../../ui/features/dashboard/ProfileButton';
import { QuickActions } from '../../ui/features/dashboard/QuickActions';
import { TodayCard } from '../../ui/features/dashboard/TodayCard';
import { TrendCard } from '../../ui/features/dashboard/TrendCard';
import { useDashboard } from '../../ui/features/dashboard/useDashboard';
import { spacing } from '../../ui/theme';
import { clock } from '../../utils/clock';
import { formatDuration } from '../../utils/time';

function greeting(hour: number) {
  if (hour < 12) return 'Buenos días';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

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
  const monthName = format(now, 'MMMM', { locale: es });

  return (
    <Screen>
      <View style={styles.header}>
        {data?.name ? (
          <View style={styles.greeting} accessible accessibilityRole="header" accessibilityLabel={`${greeting(now.getHours())}, ${data.name}`}>
            <AppText variant="label" muted>
              {greeting(now.getHours())}
            </AppText>
            <AppText variant="display" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {data.name}
            </AppText>
          </View>
        ) : (
          <AppText variant="display" style={styles.greeting}>
            {greeting(now.getHours())}
          </AppText>
        )}
        <ProfileButton name={data?.name} />
      </View>
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

      {data ? (
        <FadeIn delay={180}>
          <TrendCard daily={data.daily} />
        </FadeIn>
      ) : null}

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
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  greeting: { flex: 1, gap: 2 },
  metrics: { flexDirection: 'row', gap: spacing.lg },
  metric: { flex: 1, gap: 2 },
});
