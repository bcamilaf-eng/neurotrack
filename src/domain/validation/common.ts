/**
 * Piezas de validación compartidas por todos los esquemas de NEUROTRACK.
 * Los mensajes están en español y se muestran tal cual en los formularios.
 */
import { z } from 'zod';
import { clock } from '../../utils/clock';
import { isIsoDate, isIsoInstant, HH_MM, toLocalDate } from '../../utils/time';

/** Margen para relojes ligeramente desincronizados al validar «no futuro». */
export const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

export const msg = {
  required: 'Este campo es obligatorio.',
  date: 'Introduce una fecha válida (AAAA-MM-DD).',
  futureDate: 'La fecha no puede ser futura.',
  instant: 'Introduce una fecha y hora válidas.',
  futureInstant: 'La hora no puede ser futura.',
  time: 'Introduce una hora válida (HH:MM).',
  integer: 'Debe ser un número entero.',
  tooLong: (max: number) => `Máximo ${max} caracteres.`,
  range: (min: number, max: number) => `Debe estar entre ${min} y ${max}.`,
};

export const isoDate = z.string({ error: msg.required }).refine(isIsoDate, msg.date);

/** Día local que no puede estar en el futuro. */
export const pastOrTodayDate = isoDate.refine(
  (value) => value <= toLocalDate(clock.now()),
  msg.futureDate,
);

export const isoInstant = z.string({ error: msg.required }).refine(isIsoInstant, msg.instant);

export const pastInstant = isoInstant.refine(
  (value) => Date.parse(value) <= clock.now().getTime() + FUTURE_TOLERANCE_MS,
  msg.futureInstant,
);

export const hhmm = z.string({ error: msg.required }).regex(HH_MM, msg.time);

export const intInRange = (min: number, max: number) =>
  z
    .number({ error: msg.required })
    .int(msg.integer)
    .min(min, msg.range(min, max))
    .max(max, msg.range(min, max));

export const numberInRange = (min: number, max: number) =>
  z
    .number({ error: msg.required })
    .min(min, msg.range(min, max))
    .max(max, msg.range(min, max));

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, msg.tooLong(max))
    .optional()
    .transform((value) => (value ? value : undefined));

export const requiredText = (max: number) =>
  z.string({ error: msg.required }).trim().min(1, msg.required).max(max, msg.tooLong(max));

/** Lista de códigos de catálogo sin repetidos. */
export const codeList = <K extends string>(codes: [K, ...K[]]) =>
  z
    .array(z.enum(codes))
    .default([])
    .transform((items) => Array.from(new Set(items)));

/** Convierte el resultado de Zod en un mapa `campo → mensaje` para formularios. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
