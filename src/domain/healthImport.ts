/**
 * Conversión de datos del almacén de salud del teléfono (Health Connect / Apple Salud)
 * a registros de NeuroTrack. Funciones puras: la lectura nativa vive en `src/services/health`.
 *
 * Reglas:
 * - Solo se importa lo que la persona autorizó, y nunca se pisa un registro escrito a mano.
 * - El día de una noche de sueño es el día en que se despierta.
 * - La calidad del sueño no se inventa: queda vacía para que la persona la complete si quiere.
 */
import { format, parseISO } from 'date-fns';
import type { RecordSource, SleepInput } from './entities/habits';

export interface InstantSample {
  time: string;
  value: number;
}

export interface IntervalSample {
  startTime: string;
  endTime: string;
}

export interface HealthSnapshot {
  /** Kilogramos. */
  weight: InstantSample[];
  /** Metros. */
  height: InstantSample[];
  sleep: IntervalSample[];
  /** Mililitros por toma. */
  hydration: (IntervalSample & { volumeMl: number })[];
  /** Días con flujo o períodos menstruales. */
  menstruationFlow: { time: string }[];
  menstruationPeriods: IntervalSample[];
}

export interface ImportPlan {
  weightKg?: number;
  heightCm?: number;
  sleep: SleepInput[];
  /** Total de agua por día local. */
  hydration: { date: string; amountMl: number }[];
  menstruationDays: string[];
}

const localDay = (iso: string) => format(parseISO(iso), 'yyyy-MM-dd');
const round1 = (n: number) => Math.round(n * 10) / 10;

function latest(samples: InstantSample[]): number | undefined {
  if (samples.length === 0) return undefined;
  return [...samples].sort((a, b) => b.time.localeCompare(a.time))[0].value;
}

function daysBetween(startIso: string, endIso: string): string[] {
  const days: string[] = [];
  const end = parseISO(endIso);
  for (let d = parseISO(startIso); d <= end; d = new Date(d.getTime() + 86_400_000)) days.push(format(d, 'yyyy-MM-dd'));
  const last = format(end, 'yyyy-MM-dd');
  if (!days.includes(last)) days.push(last);
  return days;
}

export function planImport(snapshot: HealthSnapshot, source: Exclude<RecordSource, 'manual'>): ImportPlan {
  const weight = latest(snapshot.weight);
  const height = latest(snapshot.height);

  // Una noche por día: la sesión más larga que termina ese día.
  const nights = new Map<string, IntervalSample>();
  for (const session of snapshot.sleep) {
    const minutes = (Date.parse(session.endTime) - Date.parse(session.startTime)) / 60_000;
    if (minutes <= 0 || minutes > 24 * 60) continue;
    const day = localDay(session.endTime);
    const current = nights.get(day);
    if (!current || Date.parse(current.endTime) - Date.parse(current.startTime) < minutes * 60_000) nights.set(day, session);
  }

  const water = new Map<string, number>();
  for (const intake of snapshot.hydration) {
    if (!(intake.volumeMl > 0)) continue;
    const day = localDay(intake.startTime);
    water.set(day, (water.get(day) ?? 0) + intake.volumeMl);
  }

  const menstruation = new Set<string>();
  for (const flow of snapshot.menstruationFlow) menstruation.add(localDay(flow.time));
  for (const period of snapshot.menstruationPeriods) for (const day of daysBetween(period.startTime, period.endTime)) menstruation.add(day);

  return {
    weightKg: weight !== undefined && weight >= 20 && weight <= 300 ? round1(weight) : undefined,
    heightCm: height !== undefined && height * 100 >= 50 && height * 100 <= 250 ? round1(height * 100) : undefined,
    sleep: [...nights.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, s]) => ({ date, bedtimeAt: s.startTime, wakeAt: s.endTime, source })),
    hydration: [...water.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, ml]) => ({ date, amountMl: Math.min(10_000, Math.round(ml)) })),
    menstruationDays: [...menstruation].sort(),
  };
}
