/**
 * Informe para el profesional de salud (§17): resumen del período, tabla de episodios,
 * medicación, gráficos y observaciones en lenguaje no diagnóstico.
 *
 * Funciones puras: reciben los registros y devuelven el informe ya redactado. La
 * exportación (PDF, CSV) solo da formato a este objeto.
 */
import { addMonths, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ALARM_SIGNALS, type AlarmSignal } from '../alerts/rules';
import { type PatternResult, PATTERN_FOOTER, INSIGHT_LABELS, type InsightKind } from '../analytics/patterns';
import { type DateRange, daysIn, periodBuckets, periodRange } from '../analytics/periods';
import { evolutionStats, type MedicationLike, type MedicationStats } from '../analytics/stats';
import type { EpisodeLike } from '../analytics/summary';
import {
  EPISODE_TYPES,
  type EpisodeType,
  labelOf,
  type DoseUnit,
  SYMPTOMS,
  type SymptomType,
  TRIGGERS,
  type TriggerType,
} from '../catalogs';
import { ValidationError } from '../errors';
import { medicationSummary, responseSummary } from '../medicationFormat';
import { formatDuration, isIsoDate } from '../../utils/time';

export const REPORT_PERIODS = [
  { code: '7d', label: 'Últimos 7 días' },
  { code: '30d', label: 'Últimos 30 días' },
  { code: '3m', label: 'Últimos 3 meses' },
  { code: 'custom', label: 'Personalizado' },
] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number]['code'];

/** Período personalizado más largo que se acepta. */
export const MAX_CUSTOM_MONTHS = 12;

export const REPORT_DISCLAIMER =
  'Informe generado con NeuroTrack a partir de los datos que registró el propio paciente. No es un diagnóstico ni sustituye la valoración de un profesional de salud. Las asociaciones estadísticas describen coincidencias en los registros y no demuestran causa.';

export const REPORT_COLUMNS = ['Fecha', 'Hora', 'Duración', 'Intensidad', 'Síntomas', 'Posibles factores', 'Tratamiento', 'Respuesta'] as const;

/** Rango del informe. Para «Personalizado» valida las fechas y lanza `ValidationError`. */
export function reportRange(period: ReportPeriod, now: Date, custom?: { from: string; to: string }): DateRange {
  if (period !== 'custom') return periodRange(period, now);
  const errors: Record<string, string> = {};
  const from = custom?.from ?? '';
  const to = custom?.to ?? '';
  const today = format(now, 'yyyy-MM-dd');
  if (!isIsoDate(from)) errors.from = 'Elige la fecha de inicio.';
  if (!isIsoDate(to)) errors.to = 'Elige la fecha de fin.';
  else if (to > today) errors.to = 'La fecha de fin no puede ser futura.';
  if (!errors.from && !errors.to) {
    if (from > to) errors.from = 'La fecha de inicio debe ser anterior a la de fin.';
    else if (from < format(addMonths(parseISO(to), -MAX_CUSTOM_MONTHS), 'yyyy-MM-dd')) {
      errors.from = `El período no puede superar ${MAX_CUSTOM_MONTHS} meses.`;
    }
  }
  if (Object.keys(errors).length) throw new ValidationError(errors);
  return { from, to };
}

export interface ReportEpisode extends EpisodeLike {
  id: string;
  type: EpisodeType;
  typeOther?: string;
  symptoms: { type: SymptomType }[];
  triggers: { type: TriggerType; detail?: string }[];
}

export interface ReportMedication extends MedicationLike {
  id: string;
  episodeId?: string;
  takenAt: string;
  doseValue: number;
  doseUnit: DoseUnit;
}

export interface ReportInput {
  range: DateRange;
  generatedAt: Date;
  patientName?: string;
  /** Episodios del período (y hasta una semana antes, para contar días con dolor). */
  episodes: ReportEpisode[];
  medications: ReportMedication[];
  alarms: { episodeId: string; signal: AlarmSignal }[];
  /** Resultado de «Patrones personales»; las asociaciones solo se incluyen si el usuario lo aceptó. */
  patterns: PatternResult | null;
  patternsConsented: boolean;
}

export interface ReportRow {
  episodeId: string;
  date: string;
  time: string;
  duration: string;
  intensity: string;
  type: string;
  symptoms: string;
  factors: string;
  treatment: string;
  response: string;
  alarms: string;
}

export interface ReportObservation {
  kind: InsightKind;
  label: string;
  title: string;
  text: string;
}

export interface Report {
  title: string;
  patientName?: string;
  periodLabel: string;
  generatedLabel: string;
  range: DateRange;
  summary: {
    days: number;
    episodes: number;
    painDays: number;
    avgIntensity: string;
    avgDuration: string;
  };
  rows: ReportRow[];
  buckets: { label: string; episodes: number; avgIntensity: number | null }[];
  intensityDistribution: { label: string; count: number }[];
  medication: MedicationStats;
  /** Tomas del período que no están vinculadas a un episodio. */
  unlinkedMedication: string[];
  observations: ReportObservation[];
  observationsFooter: string;
  disclaimer: string;
}

const dayLabel = (iso: string) => format(parseISO(iso), 'dd/MM/yyyy');
const longDay = (day: string) => format(parseISO(day), "d 'de' MMMM 'de' yyyy", { locale: es });
const decimal = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 });

/** Tramos de los gráficos según la longitud del rango: días, semanas o meses. */
export function reportBuckets(range: DateRange) {
  const days = daysIn(range);
  return periodBuckets(days <= 14 ? '7d' : days <= 120 ? '30d' : '6m', range);
}

function joinOr(values: string[], empty = '—'): string {
  return values.length ? values.join(', ') : empty;
}

export function buildReport(input: ReportInput): Report {
  const { range } = input;
  const inPeriod = input.episodes
    .filter((e) => e.date >= range.from && e.date <= range.to)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const medications = input.medications.filter((m) => m.date >= range.from && m.date <= range.to);
  const stats = evolutionStats(
    { episodes: input.episodes, medications, painFreeDates: [] },
    range,
    reportBuckets(range),
    input.generatedAt,
  );

  const episodeIds = new Set(inPeriod.map((e) => e.id));
  const rows: ReportRow[] = inPeriod.map((e) => {
    const doses = medications
      .filter((m) => m.episodeId === e.id)
      .sort((a, b) => a.takenAt.localeCompare(b.takenAt));
    const type = e.type === 'other' && e.typeOther ? e.typeOther : labelOf(EPISODE_TYPES, e.type);
    return {
      episodeId: e.id,
      date: dayLabel(e.startedAt),
      time: format(parseISO(e.startedAt), 'HH:mm'),
      duration: e.ongoing ? 'En curso' : e.durationMin !== null ? formatDuration(e.durationMin) : '—',
      intensity: `${e.maxIntensity}/10`,
      type,
      symptoms: joinOr(e.symptoms.map((s) => labelOf(SYMPTOMS, s.type))),
      factors: joinOr(
        e.triggers
          .filter((t) => t.type !== 'unidentified')
          .map((t) => (t.detail ? `${labelOf(TRIGGERS, t.type)} (${t.detail})` : labelOf(TRIGGERS, t.type))),
        e.triggers.some((t) => t.type === 'unidentified') ? 'No identificado' : '—',
      ),
      treatment: joinOr(doses.map((m) => `${medicationSummary(m)} (${format(parseISO(m.takenAt), 'HH:mm')})`), 'Sin medicación registrada'),
      response: joinOr(doses.map(responseSummary)),
      alarms: joinOr(
        input.alarms.filter((a) => a.episodeId === e.id).map((a) => labelOf(ALARM_SIGNALS, a.signal)),
        '',
      ),
    };
  });

  const unlinkedMedication = medications
    .filter((m) => !m.episodeId || !episodeIds.has(m.episodeId))
    .sort((a, b) => a.takenAt.localeCompare(b.takenAt))
    .map((m) => `${dayLabel(m.takenAt)} ${format(parseISO(m.takenAt), 'HH:mm')} · ${medicationSummary(m)} · ${responseSummary(m)}`);

  return {
    title: 'Informe de cefaleas y migrañas registradas',
    patientName: input.patientName,
    periodLabel: `Del ${longDay(range.from)} al ${longDay(range.to)} (${stats.days} días)`,
    generatedLabel: `Generado el ${format(input.generatedAt, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}`,
    range,
    summary: {
      days: stats.days,
      episodes: stats.episodes,
      painDays: stats.painDays,
      avgIntensity: stats.avgIntensity === null ? '—' : `${decimal(stats.avgIntensity)}/10`,
      avgDuration: stats.avgDurationMin === null ? '—' : formatDuration(stats.avgDurationMin),
    },
    rows,
    buckets: stats.buckets.map((b) => ({ label: b.label, episodes: b.episodes, avgIntensity: b.avgIntensity })),
    intensityDistribution: stats.intensityDistribution,
    medication: stats.medication,
    unlinkedMedication,
    observations: observations(input, stats.medication),
    observationsFooter: PATTERN_FOOTER,
    disclaimer: REPORT_DISCLAIMER,
  };
}

function observations(input: ReportInput, medication: MedicationStats): ReportObservation[] {
  const out: ReportObservation[] = [];
  const insights = input.patterns?.insights ?? [];
  for (const insight of insights) {
    // Sin el consentimiento de «Patrones personales» solo se incluyen datos registrados.
    if (insight.kind !== 'recorded' && !input.patternsConsented) continue;
    out.push({ kind: insight.kind, label: INSIGHT_LABELS[insight.kind], title: insight.title, text: insight.text });
  }
  if (medication.doses > 0) {
    const relief = medication.responses.partial + medication.responses.complete;
    out.push({
      kind: 'recorded',
      label: INSIGHT_LABELS.recorded,
      title: 'Medicación registrada',
      text:
        `Se registraron ${medication.doses} ${medication.doses === 1 ? 'toma' : 'tomas'} en ${medication.daysWithMedication} ` +
        `${medication.daysWithMedication === 1 ? 'día' : 'días'}. ` +
        (medication.withResponse
          ? `De las ${medication.withResponse} con respuesta anotada, el paciente indicó alivio parcial o completo en ${relief}.`
          : 'No se anotó la respuesta de ninguna toma.'),
    });
  }
  const alarmEpisodes = new Set(input.alarms.map((a) => a.episodeId)).size;
  if (alarmEpisodes > 0) {
    out.push({
      kind: 'recorded',
      label: INSIGHT_LABELS.recorded,
      title: 'Señales que la app pidió valorar',
      text: `${alarmEpisodes} ${alarmEpisodes === 1 ? 'episodio incluye' : 'episodios incluyen'} alguna respuesta que la app marca para evaluación médica (ver columna de señales en la tabla).`,
    });
  }
  return out;
}

/** Nombre de archivo sin datos clínicos: «neurotrack-informe-2026-09-07_2026-10-06». */
export function reportFileName(range: DateRange): string {
  return `neurotrack-informe-${range.from}_${range.to}`;
}

