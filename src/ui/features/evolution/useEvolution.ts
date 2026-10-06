/** Carga los registros de un período y calcula estadísticas y patrones de «Mi evolución». */
import { addDays, format, parseISO } from 'date-fns';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { analyzePatterns, type PatternResult } from '../../../domain/analytics/patterns';
import { type PeriodCode, periodBuckets, periodRange } from '../../../domain/analytics/periods';
import { type EvolutionStats, evolutionStats } from '../../../domain/analytics/stats';
import { CURRENT_CONSENT_VERSION } from '../../../domain/catalogs';
import { sleepHours } from '../../../domain/entities/habits';
import type { EpisodeRecord } from '../../../data/repositories/episodeRepository';
import { getRepositories } from '../../../state/services';
import { useSession } from '../../../state/sessionStore';
import { clock } from '../../../utils/clock';

export interface EvolutionData {
  period: PeriodCode;
  stats: EvolutionStats;
  /** `null` si el usuario no ha aceptado el análisis de patrones. */
  patterns: PatternResult | null;
  episodes: EpisodeRecord[];
}

export function useEvolution(period: PeriodCode) {
  const user = useSession((s) => s.user);
  const [data, setData] = useState<EvolutionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const now = clock.now();
    const range = periodRange(period, now);
    // Una semana antes para contar los días con dolor de episodios que empezaron antes del período.
    const lookback = format(addDays(parseISO(range.from), -7), 'yyyy-MM-dd');
    const repos = await getRepositories();
    const [episodes, medications, daily, sleep, hydration, meals, consents] = await Promise.all([
      repos.episodes.listBetween(user.id, lookback, range.to),
      repos.medications.listBetween(user.id, range.from, range.to),
      repos.daily.listBetween(user.id, range.from, range.to),
      repos.sleep.listBetween(user.id, range.from, range.to),
      repos.hydration.listBetween(user.id, range.from, range.to),
      repos.meals.listBetween(user.id, range.from, range.to),
      repos.account.currentConsents(user.id),
    ]);
    const stats = evolutionStats(
      { episodes, medications, painFreeDates: daily.filter((d) => d.painFree).map((d) => d.date) },
      range,
      periodBuckets(period, range),
      now,
    );
    const consented = !!consents.pattern_analysis?.accepted;
    setData({
      period,
      stats,
      patterns: consented
        ? analyzePatterns({
            range,
            episodes,
            sleep: sleep.map((s) => ({ date: s.date, hours: sleepHours(s) })),
            daily,
            hydration,
            meals,
          })
        : null,
      episodes: episodes.filter((e) => e.date >= range.from).sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    });
  }, [user, period]);

  useFocusEffect(
    useCallback(() => {
      load()
        .then(() => setError(null))
        .catch(() => setError('No se pudieron calcular tus estadísticas.'));
    }, [load]),
  );

  /** Registra el consentimiento opcional de análisis de patrones y recalcula. */
  const enablePatterns = useCallback(async () => {
    if (!user) return;
    const repos = await getRepositories();
    await repos.account.recordConsents(user.id, [{ type: 'pattern_analysis', accepted: true, version: CURRENT_CONSENT_VERSION }]);
    await load();
  }, [user, load]);

  return { data, error, enablePatterns };
}
