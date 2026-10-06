/**
 * Registros diarios de hábitos: sueño, hidratación, alimentación y estado diario.
 *
 * Estrés, ansiedad, ánimo y carga laboral son valoraciones subjetivas del usuario.
 */
import { z } from 'zod';
import { MEAL_TYPE_CODES } from '../catalogs';
import {
  hhmm,
  intInRange,
  numberInRange,
  optionalText,
  pastInstant,
  pastOrTodayDate,
} from '../validation/common';
import { minutesBetween } from '../../utils/time';

export const sleepInputSchema = z
  .object({
    date: pastOrTodayDate,
    bedtimeAt: pastInstant,
    wakeAt: pastInstant,
    quality: intInRange(1, 5),
    awakenings: intInRange(0, 30).default(0),
    insomnia: z.boolean().default(false),
    restorative: z.boolean().optional(),
    notes: optionalText(500),
  })
  .superRefine((value, ctx) => {
    const minutes = minutesBetween(value.bedtimeAt, value.wakeAt);
    if (minutes <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['wakeAt'],
        message: 'La hora de levantarse debe ser posterior a la de acostarse.',
      });
    } else if (minutes > 24 * 60) {
      ctx.addIssue({
        code: 'custom',
        path: ['wakeAt'],
        message: 'El período de sueño no puede superar 24 horas.',
      });
    }
  });

export type SleepInput = z.input<typeof sleepInputSchema>;
export type SleepData = z.output<typeof sleepInputSchema>;

export function sleepHours(data: Pick<SleepData, 'bedtimeAt' | 'wakeAt'>): number {
  return Math.round((minutesBetween(data.bedtimeAt, data.wakeAt) / 60) * 10) / 10;
}

export const DEFAULT_HYDRATION_GOAL_ML = 2000;
export const DEFAULT_GLASS_ML = 250;

export const hydrationInputSchema = z.object({
  date: pastOrTodayDate,
  amountMl: intInRange(0, 10000),
  glasses: intInRange(0, 40).optional(),
  perceived: intInRange(1, 5).optional(),
  goalMl: intInRange(500, 6000).default(DEFAULT_HYDRATION_GOAL_ML),
});

export type HydrationInput = z.input<typeof hydrationInputSchema>;
export type HydrationData = z.output<typeof hydrationInputSchema>;

export function hydrationProgress(data: Pick<HydrationData, 'amountMl' | 'goalMl'>): number {
  if (data.goalMl <= 0) return 0;
  return Math.min(1, data.amountMl / data.goalMl);
}

export const mealInputSchema = z
  .object({
    date: pastOrTodayDate,
    mealType: z.enum(MEAL_TYPE_CODES, { error: 'Elige el tipo de comida.' }),
    time: hhmm.optional(),
    foods: z
      .array(z.string().trim().min(1).max(60))
      .max(30, 'Máximo 30 alimentos por comida.')
      .default([]),
    fasting: z.boolean().default(false),
    fastingHours: numberInRange(0, 72).optional(),
    notes: optionalText(500),
  })
  .superRefine((value, ctx) => {
    if (!value.fasting && !value.time) {
      ctx.addIssue({ code: 'custom', path: ['time'], message: 'Indica la hora de la comida.' });
    }
    if (value.fasting && value.fastingHours === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['fastingHours'],
        message: 'Indica cuántas horas de ayuno.',
      });
    }
  });

export type MealInput = z.input<typeof mealInputSchema>;
export type MealData = z.output<typeof mealInputSchema>;

export const dailyRecordInputSchema = z.object({
  date: pastOrTodayDate,
  stress: intInRange(1, 10).optional(),
  anxiety: intInRange(1, 10).optional(),
  mood: intInRange(1, 5).optional(),
  workload: intInRange(1, 5).optional(),
  stressfulSituations: optionalText(500),
  painFree: z.boolean().default(false),
  notes: optionalText(1000),
});

export type DailyRecordInput = z.input<typeof dailyRecordInputSchema>;
export type DailyRecordData = z.output<typeof dailyRecordInputSchema>;
