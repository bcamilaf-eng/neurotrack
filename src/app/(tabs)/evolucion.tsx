/**
 * «Mi evolución»: estadísticas del período elegido, respuesta a la medicación registrada
 * y «Patrones personales» (si el usuario aceptó el análisis).
 */
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { PATTERN_FOOTER, PATTERN_RULES } from '../../domain/analytics/patterns';
import { type PeriodCode, PERIODS } from '../../domain/analytics/periods';
import { EPISODE_TYPES, labelOf } from '../../domain/catalogs';
import { MEDICATION_NOTICE } from '../../i18n/es';
import {
  AppText,
  Banner,
  BarChart,
  Button,
  Card,
  Disclaimer,
  LineChart,
  ListRow,
  OptionGroup,
  Screen,
} from '../../ui/components';
import { FrequencyHeatmap } from '../../ui/features/evolution/FrequencyHeatmap';
import { PatternInsightCard } from '../../ui/features/evolution/PatternInsightCard';
import { useEvolution } from '../../ui/features/evolution/useEvolution';
import { spacing } from '../../ui/theme';
import { formatDuration } from '../../utils/time';

const num = (n: number) => n.toLocaleString('es-ES');
const percent = (part: number, total: number) => (total ? `${Math.round((part / total) * 100)} %` : '—');

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="title">{value}</AppText>
      <AppText variant="caption" muted>
        {label}
      </AppText>
    </View>
  );
}

export default function EvolutionScreen() {
  const [period, setPeriod] = useState<PeriodCode>('30d');
  const { data, error, enablePatterns } = useEvolution(period);
  const [enabling, setEnabling] = useState(false);
  const stats = data?.period === period ? data.stats : null;
  const patterns = data?.period === period ? data.patterns : undefined;
  const med = stats?.medication;
  const periodLabel = labelOf(PERIODS, period);

  const onEnable = async () => {
    setEnabling(true);
    try {
      await enablePatterns();
    } finally {
      setEnabling(false);
    }
  };

  return (
    <Screen>
      <AppText variant="title">Mi evolución</AppText>
      <OptionGroup label="Período" options={PERIODS} value={period} onChange={(v) => v && setPeriod(v)} />
      {error ? <Banner tone="danger" message={error} /> : null}
      {!stats ? <AppText muted>Calculando…</AppText> : null}

      {stats ? (
        <>
          <Card>
            <AppText variant="heading">Resumen · {periodLabel}</AppText>
            <View style={styles.metrics}>
              <Metric value={num(stats.episodes)} label="Episodios" />
              <Metric value={num(stats.painDays)} label="Días con dolor" />
            </View>
            <View style={styles.metrics}>
              <Metric value={num(stats.daysWithoutPain)} label="Días sin dolor registrado" />
              <Metric value={stats.avgIntensity !== null ? `${num(stats.avgIntensity)}/10` : '—'} label="Intensidad promedio" />
            </View>
            <View style={styles.metrics}>
              <Metric value={stats.avgDurationMin !== null ? formatDuration(stats.avgDurationMin) : '—'} label="Duración promedio" />
              <Metric value={num(med!.doses)} label="Tomas de medicación" />
            </View>
            {stats.markedPainFree > 0 ? (
              <AppText variant="caption" muted>
                {stats.markedPainFree} de los días sin dolor los marcaste expresamente.
              </AppText>
            ) : null}
          </Card>

          {stats.episodes === 0 ? (
            <AppText muted>No hay episodios registrados en este período.</AppText>
          ) : (
            <Card>
              <BarChart
                title="Episodios por tramo"
                data={stats.buckets.map((b) => ({ label: b.label, value: b.episodes }))}
                summary={`${stats.episodes} episodios en ${periodLabel}, repartidos en ${stats.buckets.length} tramos.`}
              />
              <LineChart
                title="Intensidad promedio (línea temporal)"
                data={stats.buckets.map((b) => ({ label: b.label, value: b.avgIntensity }))}
                max={10}
                summary={`Promedio de la intensidad máxima de cada tramo, de 0 a 10. En todo el período: ${num(stats.avgIntensity ?? 0)}.`}
              />
              <BarChart
                title="Distribución de intensidad"
                data={stats.intensityDistribution.map((b) => ({ label: b.label.split(' ')[0], value: b.count }))}
                summary={stats.intensityDistribution.map((b) => `${b.label}: ${b.count}`).join(', ') + '.'}
              />
              <FrequencyHeatmap
                days={stats.dailyIntensity}
                summary={`${stats.painDays} de ${stats.days} días con dolor registrado.`}
              />
            </Card>
          )}

          <Card>
            <AppText variant="heading">Medicación registrada</AppText>
            {med!.doses === 0 ? (
              <AppText muted>No registraste tomas en este período.</AppText>
            ) : (
              <>
                <AppText>
                  {med!.doses} {med!.doses === 1 ? 'toma' : 'tomas'} en {med!.daysWithMedication}{' '}
                  {med!.daysWithMedication === 1 ? 'día' : 'días'}.
                </AppText>
                {med!.withResponse > 0 ? (
                  <AppText>
                    Respuesta registrada en {med!.withResponse}: alivio completo {percent(med!.responses.complete, med!.withResponse)}, parcial{' '}
                    {percent(med!.responses.partial, med!.withResponse)}, sin alivio {percent(med!.responses.none, med!.withResponse)}.
                    {med!.avgMinutesToRelief !== null ? ` Alivio en ${med!.avgMinutesToRelief} min de promedio.` : ''}
                  </AppText>
                ) : (
                  <AppText muted>Aún no has registrado cómo respondiste a estas tomas.</AppText>
                )}
                {med!.byName.map((m) => (
                  <ListRow
                    key={m.name}
                    title={m.name}
                    subtitle={
                      m.withResponse
                        ? `Con alivio en ${m.relief} de ${m.withResponse} tomas con respuesta registrada`
                        : 'Sin respuesta registrada'
                    }
                    value={`${m.doses} ${m.doses === 1 ? 'toma' : 'tomas'}`}
                  />
                ))}
              </>
            )}
            <AppText variant="caption" muted>
              {MEDICATION_NOTICE}
            </AppText>
          </Card>

          <View style={styles.section}>
            <AppText variant="heading">Patrones personales</AppText>
            {patterns === null ? (
              <Card>
                <AppText>
                  El análisis de patrones busca posibles asociaciones en tus registros (sueño, estrés, hidratación, comidas).
                  Se hace solo en este teléfono y necesita tu permiso.
                </AppText>
                <Button label="Activar análisis de patrones" onPress={onEnable} loading={enabling} testID="enable-patterns" />
              </Card>
            ) : patterns ? (
              <>
                {patterns.insights.map((insight) => (
                  <PatternInsightCard key={insight.id} insight={insight} />
                ))}
                {!patterns.enoughData ? (
                  <Banner
                    tone="info"
                    title="Datos insuficientes para buscar asociaciones"
                    message={`Hacen falta al menos ${PATTERN_RULES.minEpisodes} episodios en el período (llevas ${patterns.episodes}) y ${PATTERN_RULES.minFactorDays} días con registro de cada factor. Prueba un período más largo o sigue registrando.`}
                  />
                ) : null}
                <AppText variant="caption" muted>
                  {PATTERN_FOOTER}
                </AppText>
              </>
            ) : null}
          </View>

          {data && data.episodes.length > 0 ? (
            <View>
              <AppText variant="heading">Episodios del período</AppText>
              {data.episodes.slice(0, 10).map((e) => (
                <ListRow
                  key={e.id}
                  title={format(parseISO(e.startedAt), "EEEE d 'de' MMMM, HH:mm", { locale: es })}
                  subtitle={`${labelOf(EPISODE_TYPES, e.type)} · ${e.ongoing ? 'en curso' : e.durationMin !== null ? formatDuration(e.durationMin) : ''}`}
                  value={`${e.maxIntensity}/10`}
                  onPress={() => router.push({ pathname: '/episodio/[id]', params: { id: e.id } })}
                />
              ))}
            </View>
          ) : null}
        </>
      ) : null}

      <Card>
        <AppText variant="heading">Informe para tu consulta</AppText>
        <AppText muted>Resumen en PDF o CSV de tus episodios, medicación y observaciones, para compartir con tu profesional de salud.</AppText>
        <Button label="Generar informe" onPress={() => router.push('/informe')} testID="open-report" />
      </Card>
      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', gap: spacing.lg },
  metric: { flex: 1, gap: 2 },
  section: { gap: spacing.sm },
});
