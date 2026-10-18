/** Carga los datos de Inicio: resumen del mes, últimas semanas y estado de hoy. */
import { addDays, format, startOfMonth, startOfWeek } from 'date-fns';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import type { EpisodeRecord } from '../../../data/repositories/episodeRepository';
import { daysSinceLast, type PeriodSummary, summarize, type WeekBucket, weeklyBuckets } from '../../../domain/analytics/summary';
import { sleepHours } from '../../../domain/entities/habits';
import { getRepositories } from '../../../state/services';
import { useSession } from '../../../state/sessionStore';
import { clock } from '../../../utils/clock';
import { toLocalDate } from '../../../utils/time';

export const CHART_WEEKS = 8;

/** Lo anotado hoy fuera de los episodios, para el resumen del día. */
export interface TodaySnapshot {
  /** Horas dormidas la noche que terminó hoy. */
  sleepHours: number | null;
  hydration: { amountMl: number; goalMl: number } | null;
  medicationCount: number;
}

export interface DashboardData {
  name?: string;
  today: TodaySnapshot;
  month: PeriodSummary;
  daysSinceLast: number | null;
  weeks: WeekBucket[];
  ongoing: EpisodeRecord[];
  recent: EpisodeRecord[];
  todayPainFree: boolean;
  todayHasEpisode: boolean;
  /** Episodios que empezaron hoy. */
  todayEpisodes: number;
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
    const [profile, episodes, latest, ongoing, daily, sleep, hydration, medications] = await Promise.all([
      repos.account.getProfile(user.id),
      repos.episodes.listBetween(user.id, from, today),
      repos.episodes.latest(user.id),
      repos.episodes.ongoing(user.id),
      repos.daily.getByDate(user.id, today),
      repos.sleep.getByDate(user.id, today),
      repos.hydration.getByDate(user.id, today),
      repos.medications.listBetween(user.id, today, today),
    ]);
    setData({
      name: profile?.name,
      today: {
        sleepHours: sleep ? sleepHours(sleep) : null,
        hydration: hydration ? { amountMl: hydration.amountMl, goalMl: hydration.goalMl } : null,
        medicationCount: medications.length,
      },
      month: summarize(episodes, format(monthStart, 'yyyy-MM-dd'), today, now),
      daysSinceLast: daysSinceLast(latest, now),
      weeks: weeklyBuckets(episodes, CHART_WEEKS, now),
      ongoing,
      recent: [...episodes].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 5),
      todayPainFree: !!daily?.painFree,
      todayHasEpisode: episodes.some((e) => e.date === today) || ongoing.length > 0,
      todayEpisodes: episodes.filter((e) => e.date === today).length,
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
