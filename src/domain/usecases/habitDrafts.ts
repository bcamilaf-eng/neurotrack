/**
 * Borradores de los registros diarios (sueño, hidratación, comidas y estado del día)
 * tal como los editan los formularios, y su conversión al modelo de dominio.
 */
import { addDays, format, parseISO } from 'date-fns';
import type { MealType } from '../catalogs';
import {
  DEFAULT_GLASS_ML,
  DEFAULT_HYDRATION_GOAL_ML,
  type DailyRecordData,
  type DailyRecordInput,
  type HydrationData,
  type HydrationInput,
  type MealData,
  type MealInput,
  type SleepData,
  type SleepInput,
} from '../entities/habits';
import { ValidationError } from '../errors';
import { combineDateAndTime, HH_MM, isIsoDate, minutesBetween } from '../../utils/time';
import { optionalString, parseOptionalNumber } from '../../utils/parse';

function requireDate(date: string, errors: Record<string, string>) {
  if (!isIsoDate(date)) errors.date = 'Introduce una fecha válida.';
}

function throwIfAny(errors: Record<string, string>) {
  if (Object.keys(errors).length) throw new ValidationError(errors);
}

/** Número opcional de un campo de texto; si no se lee, deja el error en `errors[field]`. */
function readNumber(text: string, field: string, errors: Record<string, string>): number | undefined {
  const value = parseOptionalNumber(text);
  if (Number.isNaN(value)) {
    errors[field] = 'Escribe un número.';
    return undefined;
  }
  return value;
}

// ── Sueño ────────────────────────────────────────────────────────────────────

/**
 * La noche se registra con el día en que te levantas: «dormí del domingo al lunes»
 * es el sueño del lunes. Si la hora de acostarse es posterior a la de levantarse,
 * se entiende que te acostaste el día anterior.
 */
export interface SleepDraft {
  date: string;
  bedtime: string;
  wakeTime: string;
  quality: number | undefined;
  awakenings: string;
  insomnia: boolean;
  restorative: boolean | undefined;
  notes: string;
}

export function emptySleepDraft(date: string): SleepDraft {
  return {
    date,
    bedtime: '23:00',
    wakeTime: '07:00',
    quality: undefined,
    awakenings: '0',
    insomnia: false,
    restorative: undefined,
    notes: '',
  };
}

/** Instantes de acostarse y levantarse a partir del día y las dos horas. */
export function sleepInstants(draft: Pick<SleepDraft, 'date' | 'bedtime' | 'wakeTime'>): { bedtimeAt: Date; wakeAt: Date } {
  const wakeAt = combineDateAndTime(draft.date, draft.wakeTime);
  let bedtimeAt = combineDateAndTime(draft.date, draft.bedtime);
  if (bedtimeAt.getTime() >= wakeAt.getTime()) bedtimeAt = addDays(bedtimeAt, -1);
  return { bedtimeAt, wakeAt };
}

/** Horas dormidas para mostrar mientras se edita, o `null` si faltan datos. */
export function previewSleepHours(draft: SleepDraft): number | null {
  if (!isIsoDate(draft.date) || !HH_MM.test(draft.bedtime) || !HH_MM.test(draft.wakeTime)) return null;
  const { bedtimeAt, wakeAt } = sleepInstants(draft);
  return Math.round((minutesBetween(bedtimeAt.toISOString(), wakeAt.toISOString()) / 60) * 10) / 10;
}

export function sleepDraftToInput(draft: SleepDraft): SleepInput {
  const errors: Record<string, string> = {};
  requireDate(draft.date, errors);
  if (!HH_MM.test(draft.bedtime)) errors.bedtime = 'Indica la hora de acostarte.';
  if (!HH_MM.test(draft.wakeTime)) errors.wakeTime = 'Indica la hora de levantarte.';
  if (draft.quality === undefined) errors.quality = 'Indica la calidad del sueño.';
  const awakenings = readNumber(draft.awakenings, 'awakenings', errors);
  throwIfAny(errors);
  const { bedtimeAt, wakeAt } = sleepInstants(draft);
  return {
    date: draft.date,
    bedtimeAt: bedtimeAt.toISOString(),
    wakeAt: wakeAt.toISOString(),
    quality: draft.quality as number,
    awakenings: awakenings ?? 0,
    insomnia: draft.insomnia,
    restorative: draft.restorative,
    notes: optionalString(draft.notes),
  };
}

export function sleepToDraft(data: SleepData): SleepDraft {
  return {
    date: data.date,
    bedtime: format(parseISO(data.bedtimeAt), 'HH:mm'),
    wakeTime: format(parseISO(data.wakeAt), 'HH:mm'),
    quality: data.quality,
    awakenings: String(data.awakenings),
    insomnia: data.insomnia,
    restorative: data.restorative,
    notes: data.notes ?? '',
  };
}

// ── Hidratación ──────────────────────────────────────────────────────────────

export interface HydrationDraft {
  date: string;
  amountMl: string;
  glasses: number;
  perceived: number | undefined;
  goalMl: string;
}

export function emptyHydrationDraft(date: string): HydrationDraft {
  return { date, amountMl: '0', glasses: 0, perceived: undefined, goalMl: String(DEFAULT_HYDRATION_GOAL_ML) };
}

/** Suma o quita un vaso: actualiza el contador y la cantidad total. */
export function addGlasses(draft: HydrationDraft, delta: number, glassMl = DEFAULT_GLASS_ML): HydrationDraft {
  const glasses = Math.max(0, draft.glasses + delta);
  const applied = glasses - draft.glasses;
  const current = parseOptionalNumber(draft.amountMl);
  const base = current === undefined || Number.isNaN(current) ? 0 : current;
  return { ...draft, glasses, amountMl: String(Math.max(0, Math.round(base + applied * glassMl))) };
}

export function hydrationDraftToInput(draft: HydrationDraft): HydrationInput {
  const errors: Record<string, string> = {};
  requireDate(draft.date, errors);
  const amount = readNumber(draft.amountMl, 'amountMl', errors);
  const goal = readNumber(draft.goalMl, 'goalMl', errors);
  throwIfAny(errors);
  return {
    date: draft.date,
    amountMl: amount === undefined ? 0 : Math.round(amount),
    glasses: draft.glasses,
    perceived: draft.perceived,
    goalMl: goal === undefined ? DEFAULT_HYDRATION_GOAL_ML : Math.round(goal),
  };
}

export function hydrationToDraft(data: HydrationData): HydrationDraft {
  return {
    date: data.date,
    amountMl: String(data.amountMl),
    glasses: data.glasses ?? 0,
    perceived: data.perceived,
    goalMl: String(data.goalMl),
  };
}

// ── Comidas ──────────────────────────────────────────────────────────────────

export interface MealDraft {
  date: string;
  mealType: MealType | undefined;
  time: string;
  foods: string[];
  fasting: boolean;
  fastingHours: string;
  notes: string;
}

export function emptyMealDraft(date: string, now: Date): MealDraft {
  return { date, mealType: undefined, time: format(now, 'HH:mm'), foods: [], fasting: false, fastingHours: '', notes: '' };
}

/** Añade los alimentos escritos (separados por comas) sin repetir los que ya están. */
export function addFoods(foods: string[], text: string): string[] {
  const out = [...foods];
  for (const raw of text.split(/[,;\n]/)) {
    const food = raw.trim().replace(/\s+/g, ' ');
    if (!food) continue;
    if (!out.some((f) => f.toLocaleLowerCase('es') === food.toLocaleLowerCase('es'))) out.push(food.slice(0, 60));
  }
  return out;
}

export function mealDraftToInput(draft: MealDraft): MealInput {
  const errors: Record<string, string> = {};
  requireDate(draft.date, errors);
  const fastingHours = draft.fasting ? readNumber(draft.fastingHours, 'fastingHours', errors) : undefined;
  throwIfAny(errors);
  return {
    date: draft.date,
    mealType: draft.mealType as MealType,
    time: draft.fasting && !HH_MM.test(draft.time) ? undefined : draft.time,
    foods: draft.fasting ? [] : draft.foods,
    fasting: draft.fasting,
    fastingHours,
    notes: optionalString(draft.notes),
  };
}

export function mealToDraft(data: MealData): MealDraft {
  return {
    date: data.date,
    mealType: data.mealType,
    time: data.time ?? '',
    foods: [...data.foods],
    fasting: data.fasting,
    fastingHours: data.fastingHours?.toString().replace('.', ',') ?? '',
    notes: data.notes ?? '',
  };
}

// ── Estado del día ───────────────────────────────────────────────────────────

export interface DailyDraft {
  date: string;
  stress: number | undefined;
  anxiety: number | undefined;
  mood: number | undefined;
  workload: number | undefined;
  stressfulSituations: string;
  painFree: boolean;
  notes: string;
}

export function emptyDailyDraft(date: string): DailyDraft {
  return {
    date,
    stress: undefined,
    anxiety: undefined,
    mood: undefined,
    workload: undefined,
    stressfulSituations: '',
    painFree: false,
    notes: '',
  };
}

export function dailyDraftToInput(draft: DailyDraft): DailyRecordInput {
  const errors: Record<string, string> = {};
  requireDate(draft.date, errors);
  throwIfAny(errors);
  return {
    date: draft.date,
    stress: draft.stress,
    anxiety: draft.anxiety,
    mood: draft.mood,
    workload: draft.workload,
    stressfulSituations: optionalString(draft.stressfulSituations),
    painFree: draft.painFree,
    notes: optionalString(draft.notes),
  };
}

export function dailyToDraft(data: DailyRecordData): DailyDraft {
  return {
    date: data.date,
    stress: data.stress,
    anxiety: data.anxiety,
    mood: data.mood,
    workload: data.workload,
    stressfulSituations: data.stressfulSituations ?? '',
    painFree: data.painFree,
    notes: data.notes ?? '',
  };
}
