/**
 * Borrador de una toma de medicación tal como la edita el formulario (fecha y hora por
 * separado, números como texto) y su conversión al modelo de dominio.
 */
import { format, parseISO } from 'date-fns';
import type { DoseUnit, MedicationResponse } from '../catalogs';
import type { MedicationData, MedicationInput } from '../entities/medication';
import { ValidationError } from '../errors';
import { combineDateAndTime, HH_MM, isIsoDate, toLocalDate } from '../../utils/time';
import { optionalString, parseOptionalNumber } from '../../utils/parse';

export interface MedicationDraft {
  episodeId?: string;
  name: string;
  doseValue: string;
  doseUnit: DoseUnit | undefined;
  date: string;
  time: string;
  reason: string;
  prescribedByProfessional: boolean;
  response: MedicationResponse | undefined;
  minutesToRelief: string;
  adverseEffects: string;
}

export function emptyMedicationDraft(now: Date, episodeId?: string): MedicationDraft {
  return {
    episodeId,
    name: '',
    doseValue: '',
    doseUnit: undefined,
    date: toLocalDate(now),
    time: format(now, 'HH:mm'),
    reason: '',
    prescribedByProfessional: false,
    response: undefined,
    minutesToRelief: '',
    adverseEffects: '',
  };
}

/** Convierte el borrador en datos de dominio. Lanza `ValidationError` si fecha, hora o números no se leen. */
export function medicationDraftToInput(draft: MedicationDraft): MedicationInput {
  const errors: Record<string, string> = {};
  if (!isIsoDate(draft.date)) errors.date = 'Introduce una fecha válida.';
  if (!HH_MM.test(draft.time)) errors.time = 'Indica la hora de la toma.';
  const dose = parseOptionalNumber(draft.doseValue);
  if (Number.isNaN(dose)) errors.doseValue = 'Escribe la dosis como número, por ejemplo 400 o 2,5.';
  const relief = parseOptionalNumber(draft.minutesToRelief);
  if (Number.isNaN(relief)) errors.minutesToRelief = 'Escribe los minutos como número.';
  if (Object.keys(errors).length) throw new ValidationError(errors);

  return {
    episodeId: draft.episodeId,
    name: draft.name,
    doseValue: dose as number,
    doseUnit: draft.doseUnit as DoseUnit,
    takenAt: combineDateAndTime(draft.date, draft.time).toISOString(),
    reason: optionalString(draft.reason),
    prescribedByProfessional: draft.prescribedByProfessional,
    response: draft.response,
    minutesToRelief: relief,
    adverseEffects: optionalString(draft.adverseEffects),
  };
}

/** Lleva una toma guardada al formato del formulario, para editarla. */
export function medicationToDraft(data: MedicationData): MedicationDraft {
  const taken = parseISO(data.takenAt);
  return {
    episodeId: data.episodeId,
    name: data.name,
    doseValue: String(data.doseValue).replace('.', ','),
    doseUnit: data.doseUnit,
    date: toLocalDate(taken),
    time: format(taken, 'HH:mm'),
    reason: data.reason ?? '',
    prescribedByProfessional: data.prescribedByProfessional,
    response: data.response,
    minutesToRelief: data.minutesToRelief?.toString() ?? '',
    adverseEffects: data.adverseEffects ?? '',
  };
}

/** Los errores del dominio hablan de `takenAt`; el formulario muestra fecha y hora. */
export function medicationFieldErrors(fields: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, message] of Object.entries(fields)) out[key === 'takenAt' ? 'time' : key] = message;
  return out;
}
