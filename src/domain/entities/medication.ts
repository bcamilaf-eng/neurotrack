/**
 * Registro de toma de medicación.
 *
 * La app solo registra lo que el usuario tomó y cómo respondió; nunca recomienda
 * iniciar, suspender ni modificar un medicamento.
 */
import { z } from 'zod';
import { DOSE_UNIT_CODES, MEDICATION_RESPONSE_CODES } from '../catalogs';
import { intInRange, optionalText, pastInstant, requiredText } from '../validation/common';

export const medicationInputSchema = z
  .object({
    episodeId: z.string().optional(),
    name: requiredText(100),
    doseValue: z
      .number({ error: 'Indica la dosis.' })
      .positive('La dosis debe ser mayor que 0.')
      .max(10000, 'La dosis parece demasiado alta. Revísala.'),
    doseUnit: z.enum(DOSE_UNIT_CODES, { error: 'Selecciona la unidad de la dosis.' }),
    takenAt: pastInstant,
    reason: optionalText(200),
    prescribedByProfessional: z.boolean().default(false),
    response: z.enum(MEDICATION_RESPONSE_CODES).optional(),
    minutesToRelief: intInRange(0, 24 * 60).optional(),
    adverseEffects: optionalText(500),
  })
  .superRefine((value, ctx) => {
    if (value.response === 'none' && value.minutesToRelief !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['minutesToRelief'],
        message: 'Si no hubo alivio, deja vacío el tiempo hasta el alivio.',
      });
    }
  });

export type MedicationInput = z.input<typeof medicationInputSchema>;
export type MedicationData = z.output<typeof medicationInputSchema>;
