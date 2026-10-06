/**
 * Borrador de episodio tal como lo edita el formulario (fecha y horas por separado,
 * textos sin convertir) y su conversión al modelo de dominio.
 */
import type { AuraType, EpisodeType, PainLocation, PainQuality, SymptomType, TriggerType } from '../catalogs';
import type { EpisodeInput } from '../entities/episode';
import { ValidationError } from '../errors';
import { combineDateAndTime, HH_MM, isIsoDate, resolveEnd, toLocalDate } from '../../utils/time';
import { format, parseISO } from 'date-fns';

export interface EpisodeDraft {
  date: string;
  startTime: string;
  ongoing: boolean;
  /** Fecha de término. Vacía: la próxima vez que llegue `endTime` tras el inicio. */
  endDate: string;
  endTime: string;
  intensity: number | undefined;
  type: EpisodeType;
  typeOther: string;
  locations: PainLocation[];
  locationOther: string;
  qualities: PainQuality[];
  qualityOther: string;
  symptoms: SymptomType[];
  auraTypes: AuraType[];
  auraDuration: string;
  triggers: TriggerType[];
  foodDetail: string;
  triggerOther: string;
  suddenOnset: boolean;
  headTrauma: boolean;
  notes: string;
}

export function emptyDraft(now: Date = new Date()): EpisodeDraft {
  return {
    date: toLocalDate(now),
    startTime: format(now, 'HH:mm'),
    ongoing: true,
    endDate: '',
    endTime: '',
    intensity: undefined,
    type: 'unspecified',
    typeOther: '',
    locations: [],
    locationOther: '',
    qualities: [],
    qualityOther: '',
    symptoms: [],
    auraTypes: [],
    auraDuration: '',
    triggers: [],
    foodDetail: '',
    triggerOther: '',
    suddenOnset: false,
    headTrauma: false,
    notes: '',
  };
}

const blank = (s: string) => (s.trim() ? s.trim() : undefined);

/** Instante de término del borrador (no en curso). */
export function draftEnd(draft: EpisodeDraft, start: Date): Date {
  return draft.endDate ? combineDateAndTime(draft.endDate, draft.endTime) : resolveEnd(start, draft.endTime);
}

/** Convierte el borrador en datos de dominio. Lanza `ValidationError` si fecha u horas no son legibles. */
export function draftToInput(draft: EpisodeDraft): EpisodeInput {
  const errors: Record<string, string> = {};
  if (!isIsoDate(draft.date)) errors.date = 'Introduce una fecha válida.';
  if (!HH_MM.test(draft.startTime)) errors.startTime = 'Introduce la hora de inicio.';
  if (!draft.ongoing && !HH_MM.test(draft.endTime)) errors.endTime = 'Indica la hora de término o marca que continúa.';
  if (!draft.ongoing && draft.endDate && !isIsoDate(draft.endDate)) errors.endDate = 'Introduce una fecha válida.';
  if (draft.intensity === undefined) errors.intensity = 'Indica la intensidad del dolor.';
  if (Object.keys(errors).length) throw new ValidationError(errors);

  const start = combineDateAndTime(draft.date, draft.startTime);
  const auraDuration = blank(draft.auraDuration);
  const hasAura = draft.symptoms.includes('aura');

  return {
    startedAt: start.toISOString(),
    endedAt: draft.ongoing ? undefined : draftEnd(draft, start).toISOString(),
    ongoing: draft.ongoing,
    type: draft.type,
    typeOther: blank(draft.typeOther),
    intensity: draft.intensity as number,
    locations: draft.locations,
    locationOther: blank(draft.locationOther),
    qualities: draft.qualities,
    qualityOther: blank(draft.qualityOther),
    symptoms: draft.symptoms.map((type) => ({ type })),
    aura:
      hasAura && (draft.auraTypes.length > 0 || auraDuration)
        ? { types: draft.auraTypes, durationMin: auraDuration ? Number(auraDuration) : undefined }
        : undefined,
    triggers: draft.triggers.map((type) => ({
      type,
      detail: type === 'specific_food' ? blank(draft.foodDetail) : type === 'other' ? blank(draft.triggerOther) : undefined,
    })),
    suddenOnset: draft.suddenOnset || undefined,
    headTrauma: draft.headTrauma || undefined,
    notes: blank(draft.notes),
  };
}

/** Lleva un episodio guardado al formato del formulario, para editarlo. */
export function inputToDraft(input: EpisodeInput): EpisodeDraft {
  const start = parseISO(input.startedAt);
  return {
    date: toLocalDate(start),
    startTime: format(start, 'HH:mm'),
    ongoing: !!input.ongoing,
    endDate: input.endedAt ? toLocalDate(parseISO(input.endedAt)) : '',
    endTime: input.endedAt ? format(parseISO(input.endedAt), 'HH:mm') : '',
    intensity: input.intensity,
    type: input.type ?? 'unspecified',
    typeOther: input.typeOther ?? '',
    locations: [...(input.locations ?? [])],
    locationOther: input.locationOther ?? '',
    qualities: [...(input.qualities ?? [])],
    qualityOther: input.qualityOther ?? '',
    symptoms: (input.symptoms ?? []).map((s) => s.type),
    auraTypes: [...(input.aura?.types ?? [])],
    auraDuration: input.aura?.durationMin?.toString() ?? '',
    triggers: (input.triggers ?? []).map((t) => t.type),
    foodDetail: input.triggers?.find((t) => t.type === 'specific_food')?.detail ?? '',
    triggerOther: input.triggers?.find((t) => t.type === 'other')?.detail ?? '',
    suddenOnset: !!input.suddenOnset,
    headTrauma: !!input.headTrauma,
    notes: input.notes ?? '',
  };
}

/** Cambia la pertenencia de `item` a la lista (selección múltiple). */
export function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

/** Selecciona un desencadenante respetando que «No identificado» es excluyente. */
export function toggleTrigger(list: TriggerType[], item: TriggerType): TriggerType[] {
  if (item === 'unidentified') return list.includes(item) ? [] : ['unidentified'];
  return toggle(
    list.filter((t) => t !== 'unidentified'),
    item,
  );
}
