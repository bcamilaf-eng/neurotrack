/**
 * Marcas del calendario neurológico: qué se registró cada día del mes.
 *
 * La categoría del día sale de lo que anotó el usuario (tipo e intensidad del episodio),
 * no de una interpretación clínica.
 */
import { addDays, endOfMonth, format, getISODay, startOfMonth } from 'date-fns';
import type { EpisodeType } from '../catalogs';
import { type EpisodeLike, painDaysBetween } from './summary';

/** A partir de esta intensidad máxima el día se marca como «episodio intenso». */
export const INTENSE_FROM = 7;

/** Tipos registrados que el calendario muestra como migraña. */
const MIGRAINE_TYPES: readonly EpisodeType[] = ['migraine', 'jaqueca'];

export type DayCategory = 'none' | 'painFree' | 'headache' | 'migraine' | 'intense';

export const DAY_CATEGORY_LABELS: Record<DayCategory, string> = {
  none: 'Sin registros',
  painFree: 'Sin síntomas',
  headache: 'Cefalea',
  migraine: 'Migraña',
  intense: 'Episodio intenso',
};

export interface DayMark {
  date: string;
  category: DayCategory;
  medication: boolean;
  episodes: number;
  maxIntensity: number | null;
}

export interface CalendarInput {
  episodes: (EpisodeLike & { type: EpisodeType })[];
  medicationDates: string[];
  painFreeDates: string[];
}

/** Marca de un día a partir de los episodios que lo tocan. */
export function dayCategory(episodes: (EpisodeLike & { type: EpisodeType })[], painFree: boolean): DayCategory {
  if (episodes.length === 0) return painFree ? 'painFree' : 'none';
  if (episodes.some((e) => e.maxIntensity >= INTENSE_FROM)) return 'intense';
  if (episodes.some((e) => MIGRAINE_TYPES.includes(e.type))) return 'migraine';
  return 'headache';
}

/** Marcas de todos los días de `month` (cualquier fecha dentro del mes). */
export function monthMarks(month: Date, input: CalendarInput, now: Date): DayMark[] {
  const first = startOfMonth(month);
  const last = endOfMonth(month);
  const from = format(first, 'yyyy-MM-dd');
  const to = format(last, 'yyyy-MM-dd');
  const byDay = new Map<string, (EpisodeLike & { type: EpisodeType })[]>();
  for (const episode of input.episodes) {
    for (const d of painDaysBetween([episode], from, to, now)) byDay.set(d, [...(byDay.get(d) ?? []), episode]);
  }
  const medication = new Set(input.medicationDates);
  const painFree = new Set(input.painFreeDates);
  const marks: DayMark[] = [];
  for (let d = first; d <= last; d = addDays(d, 1)) {
    const date = format(d, 'yyyy-MM-dd');
    const episodes = byDay.get(date) ?? [];
    marks.push({
      date,
      category: dayCategory(episodes, painFree.has(date)),
      medication: medication.has(date),
      episodes: episodes.length,
      maxIntensity: episodes.length ? Math.max(...episodes.map((e) => e.maxIntensity)) : null,
    });
  }
  return marks;
}

/** Huecos antes del día 1 en una cuadrícula que empieza en lunes. */
export function leadingBlanks(month: Date): number {
  return getISODay(startOfMonth(month)) - 1;
}
