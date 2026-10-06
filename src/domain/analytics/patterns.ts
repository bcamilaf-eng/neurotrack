/**
 * «Patrones personales»: compara con qué frecuencia se registraron episodios en días con
 * y sin un factor (sueño corto, estrés alto, poca agua, ayuno, un alimento).
 *
 * Reglas de prudencia:
 * - solo se muestra una asociación con datos suficientes (`PATTERN_RULES`);
 * - siempre con sus números, para que se vea de cuántos días sale;
 * - nunca se habla de causas ni de diagnósticos: una coincidencia no demuestra nada.
 *
 * Los umbrales viven aquí, en un único sitio, para que un profesional pueda revisarlos.
 */
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { labelOf, type TriggerType, TRIGGERS } from '../catalogs';
import type { DateRange } from './periods';

export const PATTERN_RULES = {
  /** Episodios mínimos en el período para buscar asociaciones. */
  minEpisodes: 8,
  /** Días mínimos con registro del factor. */
  minFactorDays: 14,
  /** Días mínimos en cada grupo (con y sin el factor). */
  minGroupDays: 3,
  /** Diferencia mínima, en puntos porcentuales, para hablar de «mayor frecuencia». */
  minDifferencePoints: 10,
  shortSleepHours: 6,
  highStressFrom: 7,
  /** Proporción del objetivo de agua por debajo de la cual el día cuenta como de poca hidratación. */
  lowHydrationRatio: 0.6,
  /** Días mínimos en que se anotó un alimento para analizarlo. */
  minFoodDays: 4,
  maxFoodInsights: 3,
} as const;

export const PATTERN_FOOTER =
  'Una coincidencia en tus datos no demuestra que un factor cause los episodios. Comenta estos patrones con un profesional de salud.';

export type InsightKind = 'recorded' | 'association' | 'interpretation';

export const INSIGHT_LABELS: Record<InsightKind, string> = {
  recorded: 'Dato registrado',
  association: 'Asociación estadística',
  interpretation: 'Interpretación',
};

export interface PatternInsight {
  id: string;
  kind: InsightKind;
  title: string;
  text: string;
}

export interface PatternInput {
  range: DateRange;
  /** Episodios cuyo día de inicio está en el período. */
  episodes: { date: string; triggers: { type: TriggerType }[] }[];
  sleep: { date: string; hours: number }[];
  daily: { date: string; stress?: number }[];
  hydration: { date: string; amountMl: number; goalMl: number }[];
  meals: { date: string; fasting: boolean; foods: string[] }[];
}

export interface PatternResult {
  episodes: number;
  /** ¿Hay episodios suficientes para buscar asociaciones? */
  enoughData: boolean;
  insights: PatternInsight[];
}

interface Group {
  days: number;
  withEpisode: number;
}

export interface Comparison {
  exposed: Group;
  rest: Group;
}

const pct = (g: Group) => Math.round((g.withEpisode / g.days) * 100);
const ratio = (g: Group) => `${g.withEpisode} de ${g.days}`;
const inRange = (date: string, range: DateRange) => date >= range.from && date <= range.to;

/** Cuenta, entre los días con registro del factor, cuántos tuvieron episodio con y sin el factor. */
export function compare(days: Map<string, boolean>, episodeDates: Set<string>): Comparison {
  const exposed: Group = { days: 0, withEpisode: 0 };
  const rest: Group = { days: 0, withEpisode: 0 };
  for (const [date, isExposed] of days) {
    const group = isExposed ? exposed : rest;
    group.days += 1;
    if (episodeDates.has(date)) group.withEpisode += 1;
  }
  return { exposed, rest };
}

/** ¿Alcanza la comparación para decir algo? */
export function comparable(c: Comparison): boolean {
  return (
    c.exposed.days + c.rest.days >= PATTERN_RULES.minFactorDays &&
    c.exposed.days >= PATTERN_RULES.minGroupDays &&
    c.rest.days >= PATTERN_RULES.minGroupDays
  );
}

/** Diferencia en puntos porcentuales entre los días con y sin el factor. */
export function difference(c: Comparison): number {
  return pct(c.exposed) - pct(c.rest);
}

function factorInsight(id: string, title: string, condition: string, c: Comparison): PatternInsight {
  const diff = difference(c);
  const numbers = `${pct(c.exposed)} % de esos días (${ratio(c.exposed)}), frente al ${pct(c.rest)} % (${ratio(c.rest)}) en el resto`;
  if (diff >= PATTERN_RULES.minDifferencePoints) {
    return { id, kind: 'association', title, text: `Los episodios registrados aparecen con mayor frecuencia ${condition}: ${numbers}.` };
  }
  if (diff <= -PATTERN_RULES.minDifferencePoints) {
    return { id, kind: 'association', title, text: `Los episodios registrados aparecen con menor frecuencia ${condition}: ${numbers}.` };
  }
  return { id, kind: 'recorded', title, text: `No se observa una diferencia clara ${condition}: ${numbers}.` };
}

function recordedInsights(input: PatternInput): PatternInsight[] {
  const out: PatternInsight[] = [];
  const n = input.episodes.length;
  const days = new Set(input.episodes.map((e) => e.date)).size;
  out.push({
    id: 'count',
    kind: 'recorded',
    title: 'Episodios del período',
    text:
      n === 0
        ? 'Durante el período seleccionado no se registraron episodios.'
        : n === 1
          ? 'Durante el período seleccionado se registró 1 episodio.'
          : `Durante el período seleccionado se registraron ${n} episodios, que empezaron en ${days} ${days === 1 ? 'un mismo día' : 'días distintos'}.`,
  });

  const triggerCounts = new Map<TriggerType, number>();
  for (const episode of input.episodes) {
    for (const type of new Set(episode.triggers.map((t) => t.type))) {
      if (type !== 'unidentified' && type !== 'other') triggerCounts.set(type, (triggerCounts.get(type) ?? 0) + 1);
    }
  }
  const topTriggers = [...triggerCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (topTriggers.length) {
    out.push({
      id: 'triggers',
      kind: 'recorded',
      title: 'Posibles desencadenantes que anotaste',
      text: topTriggers.map(([type, count]) => `«${labelOf(TRIGGERS, type)}» en ${count} de ${n} episodios`).join('; ') + '.',
    });
  }

  if (n >= PATTERN_RULES.minEpisodes) {
    const weekdays = new Map<string, number>();
    for (const episode of input.episodes) {
      const name = format(parseISO(episode.date), 'EEEE', { locale: es });
      weekdays.set(name, (weekdays.get(name) ?? 0) + 1);
    }
    const sorted = [...weekdays.entries()].sort((a, b) => b[1] - a[1]);
    const [top, second] = sorted;
    if (top && top[1] >= 3 && (!second || top[1] > second[1])) {
      out.push({
        id: 'weekday',
        kind: 'recorded',
        title: 'Día de la semana',
        text: `El día de la semana con más episodios registrados fue el ${top[0]} (${top[1]} de ${n}).`,
      });
    }
  }
  return out;
}

function foodInsights(input: PatternInput, episodeDates: Set<string>): PatternInsight[] {
  // Solo cuentan los días en que se anotó alguna comida con alimentos.
  const foodsByDay = new Map<string, Set<string>>();
  const names = new Map<string, string>();
  for (const meal of input.meals) {
    if (!inRange(meal.date, input.range) || meal.fasting) continue;
    const set = foodsByDay.get(meal.date) ?? new Set<string>();
    for (const food of meal.foods) {
      const key = food.trim().toLocaleLowerCase('es');
      if (!key) continue;
      set.add(key);
      if (!names.has(key)) names.set(key, food.trim());
    }
    if (set.size) foodsByDay.set(meal.date, set);
  }
  if (foodsByDay.size < PATTERN_RULES.minFactorDays) return [];

  const candidates: { key: string; c: Comparison }[] = [];
  for (const key of names.keys()) {
    const days = new Map<string, boolean>();
    for (const [date, foods] of foodsByDay) days.set(date, foods.has(key));
    const c = compare(days, episodeDates);
    if (c.exposed.days >= PATTERN_RULES.minFoodDays && comparable(c) && difference(c) >= PATTERN_RULES.minDifferencePoints) {
      candidates.push({ key, c });
    }
  }
  return candidates
    .sort((a, b) => difference(b.c) - difference(a.c))
    .slice(0, PATTERN_RULES.maxFoodInsights)
    .map(({ key, c }) => ({
      id: `food-${key}`,
      kind: 'association' as const,
      title: 'Posible asociación detectada',
      text: `Los días en que anotaste «${names.get(key)}» se registraron episodios el ${pct(c.exposed)} % de las veces (${ratio(c.exposed)}), frente al ${pct(c.rest)} % (${ratio(c.rest)}) del resto de días con comidas anotadas.`,
    }));
}

export function analyzePatterns(input: PatternInput): PatternResult {
  const episodes = input.episodes.filter((e) => inRange(e.date, input.range));
  const scoped = { ...input, episodes };
  const insights = recordedInsights(scoped);
  const enoughData = episodes.length >= PATTERN_RULES.minEpisodes;
  if (!enoughData) return { episodes: episodes.length, enoughData, insights };

  const episodeDates = new Set(episodes.map((e) => e.date));
  const factor = (id: string, title: string, condition: string, days: Map<string, boolean>) => {
    const c = compare(days, episodeDates);
    if (comparable(c)) insights.push(factorInsight(id, title, condition, c));
  };

  const R = PATTERN_RULES;
  factor(
    'sleep',
    'Sueño y episodios',
    `después de noches con menos de ${R.shortSleepHours} h de sueño`,
    new Map(input.sleep.filter((s) => inRange(s.date, input.range)).map((s) => [s.date, s.hours < R.shortSleepHours])),
  );
  factor(
    'stress',
    'Estrés y episodios',
    `en días con estrés de ${R.highStressFrom} o más`,
    new Map(
      input.daily
        .filter((d) => inRange(d.date, input.range) && d.stress !== undefined)
        .map((d) => [d.date, (d.stress as number) >= R.highStressFrom]),
    ),
  );
  factor(
    'hydration',
    'Hidratación y episodios',
    `en días en que bebiste menos del ${Math.round(R.lowHydrationRatio * 100)} % de tu objetivo de agua`,
    new Map(
      input.hydration
        .filter((h) => inRange(h.date, input.range))
        .map((h) => [h.date, h.goalMl > 0 && h.amountMl < h.goalMl * R.lowHydrationRatio]),
    ),
  );
  const fastingDays = new Map<string, boolean>();
  for (const meal of input.meals) {
    if (inRange(meal.date, input.range)) fastingDays.set(meal.date, (fastingDays.get(meal.date) ?? false) || meal.fasting);
  }
  factor('fasting', 'Ayuno y episodios', 'en días en que anotaste un ayuno', fastingDays);
  insights.push(...foodInsights(input, episodeDates));

  return { episodes: episodes.length, enoughData, insights };
}
