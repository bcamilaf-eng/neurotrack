/**
 * Reglas de señales de alarma (§16).
 *
 * Este es el ÚNICO archivo con criterios de alerta, pensado para que lo revise un
 * neurólogo. Cualquier cambio de criterio sube `ALARM_RULES_VERSION`, que se guarda con
 * cada señal detectada para saber con qué reglas se generó.
 *
 * La app no diagnostica: una señal solo indica que lo registrado coincide con una
 * situación en la que suele recomendarse evaluación médica urgente.
 */
import type { SymptomType } from '../catalogs';

export const ALARM_RULES_VERSION = '2026-10-06.1';

/** Mensaje exacto que se muestra cuando un registro contiene alguna señal. */
export const ALARM_MESSAGE =
  'Este registro contiene una señal que puede requerir evaluación médica urgente. Considera buscar atención médica inmediata.';

export const ALARM_THRESHOLDS = {
  /** Intensidad máxima a partir de la cual un inicio en menos de un minuto es señal. */
  suddenOnsetIntensity: 9,
  /** Intensidad máxima a partir de la cual el dolor durante el embarazo o posparto es señal. */
  pregnancyIntensity: 7,
  /** Días hacia atrás para calcular el patrón habitual. */
  patternWindowDays: 90,
  /** Episodios previos mínimos para hablar de «patrón habitual». */
  patternMinEpisodes: 5,
  /** Puntos de intensidad por encima del promedio personal para considerarlo un cambio marcado. */
  patternIntensityAbove: 3,
  /** Veces el promedio personal de duración para considerarlo un cambio marcado… */
  patternDurationFactor: 2,
  /** …y además al menos tantos minutos más que el promedio (evita saltar con episodios cortos). */
  patternDurationExtraMin: 6 * 60,
} as const;

export const ALARM_SIGNALS = [
  { code: 'sudden_severe', label: 'Dolor muy intenso que llegó a su máximo en menos de un minuto' },
  { code: 'focal_deficit', label: 'Debilidad de un lado, dificultad para hablar o entumecimiento sin antecedentes registrados con aura' },
  { code: 'loss_of_consciousness', label: 'Pérdida de conciencia' },
  { code: 'confusion', label: 'Confusión importante' },
  { code: 'seizure', label: 'Convulsiones' },
  { code: 'fever_neck_stiffness', label: 'Fiebre con rigidez de cuello' },
  { code: 'head_trauma', label: 'Dolor después de un golpe fuerte en la cabeza' },
  { code: 'pregnancy', label: 'Dolor intenso durante el embarazo o el posparto' },
  { code: 'pattern_change', label: 'Episodio muy distinto de tu patrón habitual' },
] as const;
export type AlarmSignal = (typeof ALARM_SIGNALS)[number]['code'];

/** Síntomas neurológicos que cuentan como señal si no aparecieron antes en un episodio con aura. */
export const FOCAL_SYMPTOMS: readonly SymptomType[] = ['one_side_weakness', 'speech_difficulty', 'numbness'];

/** Lo que el motor necesita de un episodio (el que se evalúa y los anteriores). */
export interface AlarmEpisode {
  id: string;
  startedAt: string;
  maxIntensity: number;
  durationMin: number | null;
  symptoms: { type: SymptomType }[];
  suddenOnset?: boolean;
  headTrauma?: boolean;
}

export interface AlarmContext {
  /** Perfil: embarazo o posparto. */
  pregnantOrPostpartum?: boolean;
  /** Episodios anteriores al evaluado; el motor usa los de los últimos 90 días. */
  history: AlarmEpisode[];
  /** Síntomas registrados en episodios anteriores que tuvieron aura (cualquier antigüedad). */
  auraHistorySymptoms: SymptomType[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

/** ¿Es el episodio marcadamente distinto de los de los últimos 90 días? */
export function isPatternChange(episode: AlarmEpisode, history: AlarmEpisode[]): boolean {
  const T = ALARM_THRESHOLDS;
  const start = Date.parse(episode.startedAt);
  const previous = history.filter((h) => {
    const t = Date.parse(h.startedAt);
    return h.id !== episode.id && t < start && t >= start - T.patternWindowDays * DAY_MS;
  });
  if (previous.length < T.patternMinEpisodes) return false;
  const avgIntensity = average(previous.map((h) => h.maxIntensity));
  if (episode.maxIntensity - avgIntensity >= T.patternIntensityAbove) return true;
  const durations = previous.map((h) => h.durationMin).filter((d): d is number => d !== null);
  if (episode.durationMin === null || durations.length < T.patternMinEpisodes) return false;
  const avgDuration = average(durations);
  return (
    episode.durationMin >= avgDuration * T.patternDurationFactor &&
    episode.durationMin - avgDuration >= T.patternDurationExtraMin
  );
}

/** Señales presentes en un episodio, en el orden de `ALARM_SIGNALS`. */
export function evaluateAlarmSignals(episode: AlarmEpisode, context: AlarmContext): AlarmSignal[] {
  const T = ALARM_THRESHOLDS;
  const symptoms = new Set(episode.symptoms.map((s) => s.type));
  const found = new Set<AlarmSignal>();

  if (episode.suddenOnset && episode.maxIntensity >= T.suddenOnsetIntensity) found.add('sudden_severe');

  // Si el mismo síntoma ya se registró antes junto con aura, se considera parte de su aura habitual.
  const auraHistory = new Set(context.auraHistorySymptoms);
  if (FOCAL_SYMPTOMS.some((s) => symptoms.has(s) && !auraHistory.has(s))) found.add('focal_deficit');

  if (symptoms.has('loss_of_consciousness')) found.add('loss_of_consciousness');
  if (symptoms.has('confusion')) found.add('confusion');
  if (symptoms.has('seizure')) found.add('seizure');
  if (symptoms.has('fever') && symptoms.has('neck_stiffness')) found.add('fever_neck_stiffness');
  if (episode.headTrauma) found.add('head_trauma');
  if (context.pregnantOrPostpartum && episode.maxIntensity >= T.pregnancyIntensity) found.add('pregnancy');
  if (isPatternChange(episode, context.history)) found.add('pattern_change');

  return ALARM_SIGNALS.map((s) => s.code).filter((code) => found.has(code));
}

/**
 * Número de emergencias según el país del perfil (texto libre). Por defecto, 112: es el
 * número europeo y muchos móviles lo redirigen al servicio local. La pantalla siempre
 * muestra el número antes de marcar.
 */
const EMERGENCY_NUMBERS: [RegExp, string][] = [
  [/m[eé]xico|estados unidos|usa|eeuu|canad[aá]|panam[aá]|paraguay|uruguay|venezuela|el salvador|honduras|costa rica|rep[uú]blica dominicana|puerto rico|ecuador/i, '911'],
  [/argentina/i, '107'],
  [/chile/i, '131'],
  [/colombia/i, '123'],
];

export function emergencyNumber(country?: string): string {
  if (!country) return '112';
  for (const [pattern, number] of EMERGENCY_NUMBERS) if (pattern.test(country)) return number;
  return '112';
}
