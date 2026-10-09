/**
 * Estadísticas descriptivas sobre los episodios registrados por el usuario.
 *
 * Solo describen datos registrados (recuentos, promedios); no interpretan ni
 * diagnostican. Funciones puras: reciben registros y devuelven números.
 */
import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns';

export interface EpisodeLike {
  date: string;
  startedAt: string;
  endedAt?: string | null;
  ongoing: boolean;
  intensity: number;
  maxIntensity: number;
  durationMin: number | null;
}

export interface PeriodSummary {
  episodes: number;
  painDays: number;
  /** Promedio de la intensidad máxima de cada episodio (0–10), o `null` sin datos. */
  avgIntensity: number | null;
  /** Promedio de duración de los episodios cerrados, en minutos, o `null` sin datos. */
  avgDurationMin: number | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Días locales (`YYYY-MM-DD`) en los que hubo dolor durante el episodio. */
export function episodeDays(episode: EpisodeLike, now: Date = new Date()): string[] {
  const start = parseISO(episode.startedAt);
  const end = episode.endedAt ? parseISO(episode.endedAt) : now;
  const days: string[] = [];
  const total = Math.max(0, differenceInCalendarDays(end, start));
  for (let i = 0; i <= total; i += 1) days.push(format(addDays(start, i), 'yyyy-MM-dd'));
  return days;
}

/** Días con dolor dentro de [from, to], contando una sola vez los días con varios episodios. */
export function painDaysBetween(episodes: EpisodeLike[], from: string, to: string, now: Date = new Date()): Set<string> {
  const days = new Set<string>();
  for (const episode of episodes) {
    for (const day of episodeDays(episode, now)) if (day >= from && day <= to) days.add(day);
  }
  return days;
}

export function summarize(episodes: EpisodeLike[], from: string, to: string, now: Date = new Date()): PeriodSummary {
  const inPeriod = episodes.filter((e) => e.date >= from && e.date <= to);
  const intensities = inPeriod.map((e) => e.maxIntensity);
  const durations = inPeriod.filter((e) => e.durationMin !== null).map((e) => e.durationMin as number);
  const avgIntensity = mean(intensities);
  const avgDuration = mean(durations);
  return {
    episodes: inPeriod.length,
    painDays: painDaysBetween(episodes, from, to, now).size,
    avgIntensity: avgIntensity === null ? null : round1(avgIntensity),
    avgDurationMin: avgDuration === null ? null : Math.round(avgDuration),
  };
}

/** Días completos transcurridos desde el último episodio (0 si fue hoy o sigue en curso). */
export function daysSinceLast(last: EpisodeLike | null, now: Date = new Date()): number | null {
  if (!last) return null;
  if (last.ongoing) return 0;
  const reference = last.endedAt ? parseISO(last.endedAt) : parseISO(last.startedAt);
  return Math.max(0, differenceInCalendarDays(now, reference));
}

export interface WeekBucket {
  /** Lunes de la semana, `YYYY-MM-DD`. */
  weekStart: string;
  episodes: number;
  avgIntensity: number | null;
  avgDurationMin: number | null;
}

/** Agrupa por semanas (lunes a domingo) las últimas `weeks` semanas, incluida la actual. */
export function weeklyBuckets(episodes: EpisodeLike[], weeks: number, now: Date = new Date()): WeekBucket[] {
  const currentWeek = startOfWeek(now, { weekStartsOn: 1 });
  const buckets: WeekBucket[] = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const start = addDays(currentWeek, -7 * i);
    const from = format(start, 'yyyy-MM-dd');
    const to = format(addDays(start, 6), 'yyyy-MM-dd');
    const summary = summarize(episodes, from, to, now);
    buckets.push({
      weekStart: from,
      episodes: summary.episodes,
      avgIntensity: summary.avgIntensity,
      avgDurationMin: summary.avgDurationMin,
    });
  }
  return buckets;
}
