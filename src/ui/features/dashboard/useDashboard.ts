/** Carga los datos de Inicio: resumen del mes, últimas semanas y estado de hoy. */
import { addDays, format, startOfMonth, startOfWeek } from 'date-fns';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import type { EpisodeRecord } from '../../../data/repositories/episodeRepository';
import { daysSinceLast, type PeriodSummary, summarize, type WeekBucket, weeklyBuckets } from '../../../domain/analytics/summary';
import { getRepositories } from '../../../state/services';
import { useSession } from '../../../state/sessionStore';
import { clock } from '../../../utils/clock';
import { toLocalDate } from '../../../utils/time';

export const CHART_WEEKS = 8;

export interface DashboardData {
  name?: string;
  month: PeriodSummary;
  daysSinceLast: number | null;
  weeks: WeekBucket[];
  ongoing: EpisodeRecord[];
  recent: EpisodeRecord[];
  todayPainFree: boolean;
  todayHasEpisode: boolean;
}

export function useDashboard() {
  const user = useSession((s) => s.user);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const now = clock.now();
    const today = toLocalDate(now);
    const chartStart = addDays(startOfWeek(now, { weekStartsOn: 1 }), -7 * (CHART_WEEKS - 1));
    const monthStart = startOfMonth(now);
    // Una semana antes para contar los días con dolor de episodios que empezaron antes del periodo.
    const from = format(addDays(chartStart < monthStart ? chartStart : monthStart, -7), 'yyyy-MM-dd');

    const repos = await getRepositories();
    const [profile, episodes, latest, ongoing, daily] = await Promise.all([
      repos.account.getProfile(user.id),
      repos.episodes.listBetween(user.id, from, today),
      repos.episodes.latest(user.id),
      repos.episodes.ongoing(user.id),
      repos.daily.getByDate(user.id, today),
    ]);
    setData({
      name: profile?.name,
      month: summarize(episodes, format(monthStart, 'yyyy-MM-dd'), today, now),
      daysSinceLast: daysSinceLast(latest, now),
      weeks: weeklyBuckets(episodes, CHART_WEEKS, now),
      ongoing,
      recent: [...episodes].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 5),
      todayPainFree: !!daily?.painFree,
      todayHasEpisode: episodes.some((e) => e.date === today) || ongoing.length > 0,
    });
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setError(null);
      load().catch(() => setError('No se pudieron cargar tus registros.'));
    }, [load]),
  );

  const markPainFree = useCallback(async () => {
    if (!user) return;
    const repos = await getRepositories();
    const today = toLocalDate(clock.now());
    const existing = await repos.daily.getByDate(user.id, today);
    await repos.daily.upsertForDay(user.id, { ...(existing ?? {}), date: today, painFree: true });
    await load();
  }, [user, load]);

  return { data, error, reload: load, markPainFree };
}
