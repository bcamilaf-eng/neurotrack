/**
 * Estadísticas de «Mi evolución» para un período: frecuencia, intensidad, duración,
 * días con y sin dolor, y medicación registrada con su respuesta.
 *
 * Solo describen lo registrado. Funciones puras: reciben registros y devuelven números.
 */
import type { MedicationResponse } from '../catalogs';
import { type EpisodeLike, painDaysBetween, type PeriodSummary, summarize } from './summary';
import { type Bucket, type DateRange, daysIn, eachDay } from './periods';

export interface MedicationLike {
  date: string;
  name: string;
  response?: MedicationResponse;
  minutesToRelief?: number;
}

export interface BucketStats {
  label: string;
  from: string;
  to: string;
  episodes: number;
  avgIntensity: number | null;
  painDays: number;
}

export const INTENSITY_BANDS = [
  { code: 'mild', label: 'Leve (1–3)', min: 1, max: 3 },
  { code: 'moderate', label: 'Moderado (4–6)', min: 4, max: 6 },
  { code: 'intense', label: 'Intenso (7–9)', min: 7, max: 9 },
  { code: 'max', label: 'Máximo (10)', min: 10, max: 10 },
] as const;

export interface MedicationStats {
  doses: number;
  /** Días distintos con alguna toma. */
  daysWithMedication: number;
  /** Tomas con respuesta registrada. */
  withResponse: number;
  responses: Record<MedicationResponse, number>;
  /** Promedio de minutos hasta el alivio entre las tomas que lo registran. */
  avgMinutesToRelief: number | null;
  /** Por medicamento (sin distinguir mayúsculas), de más a menos tomas. */
  byName: { name: string; doses: number; withResponse: number; relief: number }[];
}

export interface EvolutionStats extends PeriodSummary {
  days: number;
  /** Días del período sin ningún episodio registrado. */
  daysWithoutPain: number;
  /** Días marcados expresamente como «día sin dolor». */
  markedPainFree: number;
  buckets: BucketStats[];
  intensityDistribution: { label: string; count: number }[];
  /** Intensidad máxima registrada cada día del período (`null` sin dolor), para el mapa de frecuencia. */
  dailyIntensity: { date: string; intensity: number | null }[];
  medication: MedicationStats;
}

/** Intensidad máxima de cada día con dolor (un episodio cuenta en todos los días que dura). */
export function maxIntensityByDay(episodes: EpisodeLike[], range: DateRange, now: Date): Map<string, number> {
  const out = new Map<string, number>();
  for (const episode of episodes) {
    for (const d of painDaysBetween([episode], range.from, range.to, now)) {
      out.set(d, Math.max(out.get(d) ?? 0, episode.maxIntensity));
    }
  }
  return out;
}

export function medicationStats(medications: MedicationLike[], range: DateRange): MedicationStats {
  const inPeriod = medications.filter((m) => m.date >= range.from && m.date <= range.to);
  const responses: Record<MedicationResponse, number> = { none: 0, partial: 0, complete: 0 };
  const byName = new Map<string, { name: string; doses: number; withResponse: number; relief: number }>();
  const minutes: number[] = [];
  for (const m of inPeriod) {
    if (m.response) responses[m.response] += 1;
    if (m.minutesToRelief !== undefined && m.response !== 'none') minutes.push(m.minutesToRelief);
    const key = m.name.trim().toLocaleLowerCase('es');
    const entry = byName.get(key) ?? { name: m.name.trim(), doses: 0, withResponse: 0, relief: 0 };
    entry.doses += 1;
    if (m.response) entry.withResponse += 1;
    if (m.response === 'partial' || m.response === 'complete') entry.relief += 1;
    byName.set(key, entry);
  }
  return {
    doses: inPeriod.length,
    daysWithMedication: new Set(inPeriod.map((m) => m.date)).size,
    withResponse: responses.none + responses.partial + responses.complete,
    responses,
    avgMinutesToRelief: minutes.length ? Math.round(minutes.reduce((a, b) => a + b, 0) / minutes.length) : null,
    byName: [...byName.values()].sort((a, b) => b.doses - a.doses || a.name.localeCompare(b.name, 'es')),
  };
}

export function evolutionStats(
  data: { episodes: EpisodeLike[]; medications: MedicationLike[]; painFreeDates: string[] },
  range: DateRange,
  buckets: Bucket[],
  now: Date,
): EvolutionStats {
  const summary = summarize(data.episodes, range.from, range.to, now);
  const byDay = maxIntensityByDay(data.episodes, range, now);
  const days = daysIn(range);
  const inPeriod = data.episodes.filter((e) => e.date >= range.from && e.date <= range.to);
  return {
    ...summary,
    days,
    daysWithoutPain: days - summary.painDays,
    markedPainFree: new Set(data.painFreeDates.filter((d) => d >= range.from && d <= range.to && !byDay.has(d))).size,
    buckets: buckets.map((b) => {
      const s = summarize(data.episodes, b.from, b.to, now);
      return { ...b, episodes: s.episodes, avgIntensity: s.avgIntensity, painDays: s.painDays };
    }),
    intensityDistribution: INTENSITY_BANDS.map((band) => ({
      label: band.label,
      count: inPeriod.filter((e) => e.maxIntensity >= band.min && e.maxIntensity <= band.max).length,
    })),
    dailyIntensity: eachDay(range).map((d) => ({ date: d, intensity: byDay.get(d) ?? null })),
    medication: medicationStats(data.medications, range),
  };
}
