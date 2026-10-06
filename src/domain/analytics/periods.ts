/**
 * Períodos de «Mi evolución» (7 días, 30 días, 3, 6 y 12 meses) y su división en tramos
 * para los gráficos: días, semanas o meses según la longitud del período.
 */
import { addDays, addMonths, differenceInCalendarDays, format, parseISO, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

export const PERIODS = [
  { code: '7d', label: '7 días' },
  { code: '30d', label: '30 días' },
  { code: '3m', label: '3 meses' },
  { code: '6m', label: '6 meses' },
  { code: '12m', label: '12 meses' },
] as const;
export type PeriodCode = (typeof PERIODS)[number]['code'];

export interface DateRange {
  /** Primer día incluido, `YYYY-MM-DD`. */
  from: string;
  /** Último día incluido (hoy), `YYYY-MM-DD`. */
  to: string;
}

export interface Bucket extends DateRange {
  label: string;
}

const day = (d: Date) => format(d, 'yyyy-MM-dd');

export function periodRange(period: PeriodCode, now: Date): DateRange {
  const to = day(now);
  switch (period) {
    case '7d':
      return { from: day(addDays(now, -6)), to };
    case '30d':
      return { from: day(addDays(now, -29)), to };
    case '3m':
      return { from: day(addDays(addMonths(now, -3), 1)), to };
    case '6m':
      return { from: day(addDays(addMonths(now, -6), 1)), to };
    case '12m':
      return { from: day(addDays(addMonths(now, -12), 1)), to };
  }
}

/** Número de días del rango, ambos extremos incluidos. */
export function daysIn(range: DateRange): number {
  return differenceInCalendarDays(parseISO(range.to), parseISO(range.from)) + 1;
}

/** Todos los días del rango, en orden. */
export function eachDay(range: DateRange): string[] {
  const start = parseISO(range.from);
  return Array.from({ length: Math.max(0, daysIn(range)) }, (_, i) => day(addDays(start, i)));
}

/**
 * Tramos del período para los gráficos: un tramo por día (7 días), por semana de 7 días
 * contando hacia atrás desde hoy (30 días y 3 meses) o por mes natural (6 y 12 meses).
 */
export function periodBuckets(period: PeriodCode, range: DateRange): Bucket[] {
  const from = parseISO(range.from);
  const to = parseISO(range.to);
  if (period === '7d') {
    return eachDay(range).map((d) => ({ from: d, to: d, label: format(parseISO(d), 'EEEEEE', { locale: es }) }));
  }
  if (period === '30d' || period === '3m') {
    const buckets: Bucket[] = [];
    for (let end = to; end >= from; end = addDays(end, -7)) {
      const start = addDays(end, -6) < from ? from : addDays(end, -6);
      buckets.unshift({ from: day(start), to: day(end), label: format(start, 'd MMM', { locale: es }) });
    }
    return buckets;
  }
  const buckets: Bucket[] = [];
  for (let month = startOfMonth(from); month <= to; month = addMonths(month, 1)) {
    const start = month < from ? from : month;
    const endOfMonth = addDays(addMonths(month, 1), -1);
    const end = endOfMonth > to ? to : endOfMonth;
    buckets.push({ from: day(start), to: day(end), label: format(month, 'MMM', { locale: es }) });
  }
  return buckets;
}
