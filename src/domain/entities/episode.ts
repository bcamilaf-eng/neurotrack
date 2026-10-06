/**
 * Episodio de dolor de cabeza y sus registros asociados.
 *
 * El tipo de episodio es la categoría que elige el usuario («episodio registrado
 * como migraña por el usuario»), nunca un diagnóstico.
 */
import { z } from 'zod';
import {
  AURA_TYPE_CODES,
  EPISODE_TYPE_CODES,
  PAIN_LOCATION_CODES,
  PAIN_QUALITY_CODES,
  SYMPTOM_CODES,
  TRIGGER_CODES,
} from '../catalogs';
import { codeList, intInRange, optionalText, pastInstant } from '../validation/common';
import { minutesBetween } from '../../utils/time';

/** Duración a partir de la cual se pide confirmar que el dato es correcto. */
export const LONG_EPISODE_WARNING_MIN = 72 * 60;
/** Duración máxima aceptada para un único episodio. */
export const MAX_EPISODE_MIN = 7 * 24 * 60;

export const intensitySchema = intInRange(0, 10);

export const symptomInputSchema = z.object({
  type: z.enum(SYMPTOM_CODES),
  intensity: intInRange(0, 10).optional(),
  durationMin: intInRange(0, MAX_EPISODE_MIN).optional(),
});

export const auraInputSchema = z.object({
  types: codeList(AURA_TYPE_CODES).refine((t) => t.length > 0, 'Selecciona el tipo de aura.'),
  durationMin: intInRange(0, 24 * 60).optional(),
});

export const triggerInputSchema = z.object({
  type: z.enum(TRIGGER_CODES),
  detail: optionalText(120),
});

export const episodeInputSchema = z
  .object({
    startedAt: pastInstant,
    endedAt: pastInstant.optional(),
    ongoing: z.boolean().default(false),
    type: z.enum(EPISODE_TYPE_CODES).default('unspecified'),
    typeOther: optionalText(80),
    intensity: intensitySchema,
    locations: codeList(PAIN_LOCATION_CODES),
    locationOther: optionalText(80),
    qualities: codeList(PAIN_QUALITY_CODES),
    qualityOther: optionalText(80),
    symptoms: z.array(symptomInputSchema).default([]),
    aura: auraInputSchema.optional(),
    triggers: z.array(triggerInputSchema).default([]),
    notes: optionalText(2000),
  })
  .superRefine((value, ctx) => {
    if (value.ongoing && value.endedAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['endedAt'],
        message: 'Un episodio en curso no tiene hora de término.',
      });
    }
    if (!value.ongoing && !value.endedAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['endedAt'],
        message: 'Indica la hora de término o marca que el episodio continúa.',
      });
    }
    if (value.endedAt) {
      const minutes = minutesBetween(value.startedAt, value.endedAt);
      if (minutes <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['endedAt'],
          message: 'La hora de término debe ser posterior a la de inicio.',
        });
      } else if (minutes > MAX_EPISODE_MIN) {
        ctx.addIssue({
          code: 'custom',
          path: ['endedAt'],
          message: 'Un episodio no puede durar más de 7 días. Regístralo como episodios separados.',
        });
      }
    }
    const symptomTypes = value.symptoms.map((s) => s.type);
    if (new Set(symptomTypes).size !== symptomTypes.length) {
      ctx.addIssue({ code: 'custom', path: ['symptoms'], message: 'Hay síntomas repetidos.' });
    }
    const hasAura = symptomTypes.includes('aura');
    if (value.aura && !hasAura) {
      ctx.addIssue({
        code: 'custom',
        path: ['aura'],
        message: 'Marca «Aura» en los síntomas para registrar su detalle.',
      });
    }
    const triggerTypes = value.triggers.map((t) => t.type);
    if (triggerTypes.includes('unidentified') && triggerTypes.length > 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['triggers'],
        message: '«No identificado» no se puede combinar con otros desencadenantes.',
      });
    }
    if (new Set(triggerTypes).size !== triggerTypes.length) {
      ctx.addIssue({ code: 'custom', path: ['triggers'], message: 'Hay desencadenantes repetidos.' });
    }
    const otherNeedsText: [boolean, keyof typeof value, string][] = [
      [value.type === 'other', 'typeOther', 'Describe el tipo de episodio.'],
      [value.locations.includes('other'), 'locationOther', 'Describe la localización.'],
      [value.qualities.includes('other'), 'qualityOther', 'Describe la característica del dolor.'],
    ];
    for (const [needed, field, message] of otherNeedsText) {
      if (needed && !value[field]) ctx.addIssue({ code: 'custom', path: [field], message });
    }
  });

export type EpisodeInput = z.input<typeof episodeInputSchema>;
export type EpisodeData = z.output<typeof episodeInputSchema>;

/** Punto de la línea temporal de un episodio (19:00 dolor 8/10, 20:00 medicamento…). */
export const episodeEventInputSchema = z
  .object({
    at: pastInstant,
    kind: z.enum(['pain', 'medication', 'note']),
    intensity: intInRange(0, 10).optional(),
    medicationId: z.string().optional(),
    note: optionalText(500),
  })
  .superRefine((value, ctx) => {
    if (value.kind === 'pain' && value.intensity === undefined) {
      ctx.addIssue({ code: 'custom', path: ['intensity'], message: 'Indica la intensidad del dolor.' });
    }
    if (value.kind === 'note' && !value.note) {
      ctx.addIssue({ code: 'custom', path: ['note'], message: 'Escribe la nota.' });
    }
  });

export type EpisodeEventInput = z.input<typeof episodeEventInputSchema>;
export type EpisodeEventData = z.output<typeof episodeEventInputSchema>;

/** Duración en minutos, o `null` si el episodio sigue en curso. */
export function episodeDuration(data: Pick<EpisodeData, 'startedAt' | 'endedAt'>): number | null {
  return data.endedAt ? minutesBetween(data.startedAt, data.endedAt) : null;
}

export function isLongEpisode(data: Pick<EpisodeData, 'startedAt' | 'endedAt'>): boolean {
  const minutes = episodeDuration(data);
  return minutes !== null && minutes > LONG_EPISODE_WARNING_MIN;
}

/** Dos episodios se solapan si sus intervalos comparten algún instante. */
export function intervalsOverlap(
  a: { startedAt: string; endedAt?: string | null },
  b: { startedAt: string; endedAt?: string | null },
  now: Date = new Date(),
): boolean {
  const aStart = Date.parse(a.startedAt);
  const aEnd = a.endedAt ? Date.parse(a.endedAt) : now.getTime();
  const bStart = Date.parse(b.startedAt);
  const bEnd = b.endedAt ? Date.parse(b.endedAt) : now.getTime();
  return aStart < bEnd && bStart < aEnd;
}
