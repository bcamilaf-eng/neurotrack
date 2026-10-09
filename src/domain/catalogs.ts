/**
 * Catálogos clínicos de NEUROTRACK.
 *
 * Cada catálogo es una lista cerrada de códigos estables (lo que se guarda en la
 * base de datos) con su etiqueta en español (lo que ve el usuario). Las categorías
 * de episodio son una clasificación elegida por el usuario, nunca un diagnóstico.
 */

export type Catalog<K extends string> = readonly { code: K; label: string }[];

const codes = <K extends string>(catalog: Catalog<K>) =>
  catalog.map((item) => item.code) as [K, ...K[]];

export const EPISODE_TYPES = [
  { code: 'migraine', label: 'Migraña' },
  { code: 'tension', label: 'Cefalea tensional' },
  { code: 'cluster', label: 'Cefalea en racimos' },
  { code: 'jaqueca', label: 'Jaqueca' },
  { code: 'unspecified', label: 'Cefalea no especificada' },
  { code: 'other', label: 'Otro' },
] as const;
export type EpisodeType = (typeof EPISODE_TYPES)[number]['code'];
export const EPISODE_TYPE_CODES = codes<EpisodeType>(EPISODE_TYPES);

export const PAIN_LOCATIONS = [
  { code: 'frontal', label: 'Frontal' },
  { code: 'temporal', label: 'Temporal' },
  { code: 'occipital', label: 'Occipital' },
  { code: 'retroocular', label: 'Retroocular' },
  { code: 'unilateral_right', label: 'Unilateral derecha' },
  { code: 'unilateral_left', label: 'Unilateral izquierda' },
  { code: 'bilateral', label: 'Bilateral' },
  { code: 'whole_head', label: 'Toda la cabeza' },
  { code: 'neck', label: 'Cuello/nuca' },
  { code: 'other', label: 'Otra' },
] as const;
export type PainLocation = (typeof PAIN_LOCATIONS)[number]['code'];
export const PAIN_LOCATION_CODES = codes<PainLocation>(PAIN_LOCATIONS);

export const PAIN_QUALITIES = [
  { code: 'pulsating', label: 'Pulsátil' },
  { code: 'oppressive', label: 'Opresivo' },
  { code: 'stabbing', label: 'Punzante' },
  { code: 'burning', label: 'Quemante' },
  { code: 'pressure', label: 'Presión' },
  { code: 'heaviness', label: 'Sensación de peso' },
  { code: 'other', label: 'Otro' },
] as const;
export type PainQuality = (typeof PAIN_QUALITIES)[number]['code'];
export const PAIN_QUALITY_CODES = codes<PainQuality>(PAIN_QUALITIES);

export const SYMPTOMS = [
  { code: 'nausea', label: 'Náuseas' },
  { code: 'vomiting', label: 'Vómitos' },
  { code: 'photophobia', label: 'Fotofobia' },
  { code: 'phonophobia', label: 'Fonofobia' },
  { code: 'osmophobia', label: 'Osmofobia' },
  { code: 'dizziness', label: 'Mareos' },
  { code: 'vertigo', label: 'Vértigo' },
  { code: 'visual_disturbance', label: 'Alteraciones visuales' },
  { code: 'aura', label: 'Aura' },
  { code: 'tingling', label: 'Hormigueo' },
  { code: 'numbness', label: 'Entumecimiento' },
  { code: 'speech_difficulty', label: 'Dificultad para hablar' },
  { code: 'movement_sensitivity', label: 'Sensibilidad al movimiento' },
  { code: 'fatigue', label: 'Fatiga' },
  { code: 'drowsiness', label: 'Somnolencia' },
  { code: 'irritability', label: 'Irritabilidad' },
  { code: 'concentration_difficulty', label: 'Dificultad para concentrarse' },
  // Señales que el motor de alertas (hito 5) evalúa como posibles alarmas.
  { code: 'one_side_weakness', label: 'Debilidad de un lado del cuerpo' },
  { code: 'loss_of_consciousness', label: 'Pérdida de conciencia' },
  { code: 'confusion', label: 'Confusión importante' },
  { code: 'seizure', label: 'Convulsiones' },
  { code: 'fever', label: 'Fiebre' },
  { code: 'neck_stiffness', label: 'Rigidez de cuello' },
  { code: 'other', label: 'Otros' },
] as const;
export type SymptomType = (typeof SYMPTOMS)[number]['code'];
export const SYMPTOM_CODES = codes<SymptomType>(SYMPTOMS);

export const AURA_TYPES = [
  { code: 'visual', label: 'Aura visual' },
  { code: 'sensory', label: 'Aura sensitiva' },
  { code: 'language', label: 'Aura del lenguaje' },
  { code: 'other', label: 'Otro' },
] as const;
export type AuraType = (typeof AURA_TYPES)[number]['code'];
export const AURA_TYPE_CODES = codes<AuraType>(AURA_TYPES);

export const TRIGGERS = [
  { code: 'stress', label: 'Estrés' },
  { code: 'sleep_deprivation', label: 'Falta de sueño' },
  { code: 'oversleep', label: 'Exceso de sueño' },
  { code: 'fasting', label: 'Ayuno' },
  { code: 'dehydration', label: 'Deshidratación' },
  { code: 'caffeine', label: 'Cafeína' },
  { code: 'alcohol', label: 'Alcohol' },
  { code: 'specific_food', label: 'Alimentos específicos' },
  { code: 'exercise', label: 'Ejercicio' },
  { code: 'screens', label: 'Pantallas' },
  { code: 'bright_light', label: 'Luz intensa' },
  { code: 'noise', label: 'Ruido' },
  { code: 'odors', label: 'Olores' },
  { code: 'weather', label: 'Cambios climáticos' },
  { code: 'hormonal', label: 'Menstruación/cambios hormonales' },
  { code: 'travel', label: 'Viajes' },
  { code: 'schedule_change', label: 'Cambios de horario' },
  { code: 'other', label: 'Otro' },
  { code: 'unidentified', label: 'No identificado' },
] as const;
export type TriggerType = (typeof TRIGGERS)[number]['code'];
export const TRIGGER_CODES = codes<TriggerType>(TRIGGERS);

export const MEDICATION_RESPONSES = [
  { code: 'none', label: 'Sin alivio' },
  { code: 'partial', label: 'Alivio parcial' },
  { code: 'complete', label: 'Alivio completo' },
] as const;
export type MedicationResponse = (typeof MEDICATION_RESPONSES)[number]['code'];
export const MEDICATION_RESPONSE_CODES = codes<MedicationResponse>(MEDICATION_RESPONSES);

export const DOSE_UNITS = [
  { code: 'mg', label: 'mg' },
  { code: 'g', label: 'g' },
  { code: 'mcg', label: 'mcg' },
  { code: 'ml', label: 'ml' },
  { code: 'drops', label: 'gotas' },
  { code: 'tablet', label: 'comprimido(s)' },
  { code: 'capsule', label: 'cápsula(s)' },
  { code: 'puff', label: 'inhalación(es)' },
  { code: 'injection', label: 'inyección' },
  { code: 'other', label: 'otra' },
] as const;
export type DoseUnit = (typeof DOSE_UNITS)[number]['code'];
export const DOSE_UNIT_CODES = codes<DoseUnit>(DOSE_UNITS);

/** Etiquetas de las escalas subjetivas de 1 a 5, en el orden de sus valores. */
export const SLEEP_QUALITY_LABELS = ['Muy mala', 'Mala', 'Regular', 'Buena', 'Muy buena'] as const;
export const HYDRATION_LEVEL_LABELS = ['Muy baja', 'Baja', 'Normal', 'Buena', 'Muy buena'] as const;
export const MOOD_LABELS = ['Muy bajo', 'Bajo', 'Neutro', 'Bueno', 'Muy bueno'] as const;
export const WORKLOAD_LABELS = ['Muy baja', 'Baja', 'Moderada', 'Alta', 'Muy alta'] as const;

export const MEAL_TYPES = [
  { code: 'breakfast', label: 'Desayuno' },
  { code: 'lunch', label: 'Almuerzo' },
  { code: 'snack', label: 'Merienda' },
  { code: 'dinner', label: 'Cena' },
  { code: 'other', label: 'Otra' },
] as const;
export type MealType = (typeof MEAL_TYPES)[number]['code'];
export const MEAL_TYPE_CODES = codes<MealType>(MEAL_TYPES);

export const SEX_OPTIONS = [
  { code: 'female', label: 'Femenino' },
  { code: 'male', label: 'Masculino' },
  { code: 'other', label: 'Otro' },
  { code: 'undisclosed', label: 'Prefiero no decirlo' },
] as const;
export type Sex = (typeof SEX_OPTIONS)[number]['code'];
export const SEX_CODES = codes<Sex>(SEX_OPTIONS);

export const CONSENT_TYPES = [
  { code: 'terms', label: 'Términos de uso' },
  { code: 'health_data', label: 'Tratamiento de mis datos de salud' },
  { code: 'cloud_sync', label: 'Sincronización cifrada en la nube' },
  { code: 'pattern_analysis', label: 'Análisis estadístico de mis registros' },
] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number]['code'];
export const CONSENT_TYPE_CODES = codes<ConsentType>(CONSENT_TYPES);

/** Consentimientos sin los cuales la app no puede funcionar. */
export const REQUIRED_CONSENTS: readonly ConsentType[] = ['terms', 'health_data'];

/** Versión vigente de los textos legales; al cambiarla se vuelve a pedir consentimiento. */
export const CURRENT_CONSENT_VERSION = '2026-10-06';

export function labelOf<K extends string>(catalog: Catalog<K>, code: K): string {
  return catalog.find((item) => item.code === code)?.label ?? code;
}

/** Banda descriptiva de la escala de dolor 0–10 pedida en los requisitos. */
export function painBand(intensity: number): string {
  if (intensity <= 0) return 'Sin dolor';
  if (intensity <= 3) return 'Leve';
  if (intensity <= 6) return 'Moderado';
  if (intensity <= 9) return 'Intenso';
  return 'Máximo dolor imaginable';
}
