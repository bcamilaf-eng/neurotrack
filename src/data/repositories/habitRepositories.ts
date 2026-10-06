/**
 * Repositorios de medicación y de hábitos diarios.
 */
import { type MedicationData, type MedicationInput, medicationInputSchema } from '../../domain/entities/medication';
import { ValidationError } from '../../domain/errors';
import {
  dailyRecordInputSchema,
  hydrationInputSchema,
  mealInputSchema,
  sleepHours,
  sleepInputSchema,
} from '../../domain/entities/habits';
import { toLocalDate } from '../../utils/time';
import type { SqlDatabase } from '../db/types';
import { RecordRepository, type RecordRepositoryConfig, type StoredRecord } from './recordRepository';

const MEDICATION_CONFIG: RecordRepositoryConfig<typeof medicationInputSchema> = {
  table: 'medications',
  label: 'La medicación',
  schema: medicationInputSchema,
  dateOf: (d) => toLocalDate(new Date(d.takenAt)),
  orderBy: 'taken_at',
  columns: {
    episodeId: { column: 'episode_id', kind: 'text' },
    name: { column: 'name', kind: 'text' },
    doseValue: { column: 'dose_value', kind: 'real' },
    doseUnit: { column: 'dose_unit', kind: 'text' },
    takenAt: { column: 'taken_at', kind: 'text' },
    reason: { column: 'reason', kind: 'text' },
    prescribedByProfessional: { column: 'prescribed_by_professional', kind: 'bool' },
    response: { column: 'response', kind: 'text' },
    minutesToRelief: { column: 'minutes_to_relief', kind: 'int' },
    adverseEffects: { column: 'adverse_effects', kind: 'text' },
  },
};

export type MedicationRecord = StoredRecord<MedicationData>;

/**
 * Tomas de medicación. Además de lo común, comprueba que el episodio vinculado
 * exista y sea del mismo usuario, y permite consultar por episodio.
 */
export class MedicationRepository extends RecordRepository<typeof medicationInputSchema> {
  constructor(db: SqlDatabase) {
    super(db, MEDICATION_CONFIG);
  }

  override async create(userId: string, input: MedicationInput): Promise<MedicationRecord> {
    await this.assertEpisode(userId, input.episodeId);
    return super.create(userId, input);
  }

  override async update(userId: string, id: string, input: MedicationInput): Promise<MedicationRecord> {
    await this.assertEpisode(userId, input.episodeId);
    return super.update(userId, id, input);
  }

  async listForEpisode(userId: string, episodeId: string): Promise<MedicationRecord[]> {
    const rows = await this.db.all<Record<string, unknown>>(
      `SELECT * FROM medications WHERE user_id = ? AND episode_id = ? AND deleted_at IS NULL ORDER BY taken_at`,
      [userId, episodeId],
    );
    return rows.map((row) => this.hydrate(row));
  }

  /** Últimas tomas, de la más reciente a la más antigua. */
  async listRecent(userId: string, limit = 50): Promise<MedicationRecord[]> {
    const rows = await this.db.all<Record<string, unknown>>(
      `SELECT * FROM medications WHERE user_id = ? AND deleted_at IS NULL ORDER BY taken_at DESC LIMIT ?`,
      [userId, limit],
    );
    return rows.map((row) => this.hydrate(row));
  }

  /** Medicamentos usados antes, para rellenar el formulario con un toque (el más reciente primero). */
  async recentNames(userId: string, limit = 6): Promise<Pick<MedicationData, 'name' | 'doseValue' | 'doseUnit'>[]> {
    const rows = await this.db.all<{ name: string; dose_value: number; dose_unit: string }>(
      `SELECT name, dose_value, dose_unit FROM medications m
       WHERE user_id = ? AND deleted_at IS NULL
         AND taken_at = (SELECT MAX(taken_at) FROM medications
                         WHERE user_id = m.user_id AND deleted_at IS NULL AND lower(name) = lower(m.name))
       GROUP BY lower(name)
       ORDER BY MAX(taken_at) DESC
       LIMIT ?`,
      [userId, limit],
    );
    return rows.map((r) => ({ name: r.name, doseValue: Number(r.dose_value), doseUnit: r.dose_unit as MedicationData['doseUnit'] }));
  }

  private async assertEpisode(userId: string, episodeId: string | undefined) {
    if (!episodeId) return;
    const episode = await this.db.first<{ id: string }>(
      `SELECT id FROM headache_episodes WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [episodeId, userId],
    );
    if (!episode) throw new ValidationError({ episodeId: 'El episodio vinculado ya no existe.' });
  }
}

export const createMedicationRepository = (db: SqlDatabase) => new MedicationRepository(db);

export const createSleepRepository = (db: SqlDatabase) =>
  new RecordRepository(db, {
    table: 'sleep_records',
    label: 'El registro de sueño',
    schema: sleepInputSchema,
    dateOf: (d) => d.date,
    uniquePerDay: { message: 'Ya registraste el sueño de ese día. Puedes editarlo.' },
    derived: (d) => ({ hours: sleepHours(d) }),
    columns: {
      date: { column: 'date', kind: 'text' },
      bedtimeAt: { column: 'bedtime_at', kind: 'text' },
      wakeAt: { column: 'wake_at', kind: 'text' },
      quality: { column: 'quality', kind: 'int' },
      awakenings: { column: 'awakenings', kind: 'int' },
      insomnia: { column: 'insomnia', kind: 'bool' },
      restorative: { column: 'restorative', kind: 'bool' },
      notes: { column: 'notes', kind: 'text' },
    },
  });

export const createHydrationRepository = (db: SqlDatabase) =>
  new RecordRepository(db, {
    table: 'hydration_records',
    label: 'El registro de hidratación',
    schema: hydrationInputSchema,
    dateOf: (d) => d.date,
    uniquePerDay: { message: 'Ya hay un registro de hidratación para ese día. Puedes editarlo.' },
    columns: {
      date: { column: 'date', kind: 'text' },
      amountMl: { column: 'amount_ml', kind: 'int' },
      glasses: { column: 'glasses', kind: 'int' },
      perceived: { column: 'perceived', kind: 'int' },
      goalMl: { column: 'goal_ml', kind: 'int' },
    },
  });

export const createMealRepository = (db: SqlDatabase) =>
  new RecordRepository(db, {
    table: 'meal_records',
    label: 'La comida',
    schema: mealInputSchema,
    dateOf: (d) => d.date,
    orderBy: 'time',
    columns: {
      date: { column: 'date', kind: 'text' },
      mealType: { column: 'meal_type', kind: 'text' },
      time: { column: 'time', kind: 'text' },
      foods: { column: 'foods', kind: 'json' },
      fasting: { column: 'fasting', kind: 'bool' },
      fastingHours: { column: 'fasting_hours', kind: 'real' },
      notes: { column: 'notes', kind: 'text' },
    },
  });

export const createDailyRecordRepository = (db: SqlDatabase) =>
  new RecordRepository(db, {
    table: 'daily_records',
    label: 'El registro diario',
    schema: dailyRecordInputSchema,
    dateOf: (d) => d.date,
    uniquePerDay: { message: 'Ya completaste el registro de ese día. Puedes editarlo.' },
    columns: {
      date: { column: 'date', kind: 'text' },
      stress: { column: 'stress', kind: 'int' },
      anxiety: { column: 'anxiety', kind: 'int' },
      mood: { column: 'mood', kind: 'int' },
      workload: { column: 'workload', kind: 'int' },
      stressfulSituations: { column: 'stressful_situations', kind: 'text' },
      painFree: { column: 'pain_free', kind: 'bool' },
      notes: { column: 'notes', kind: 'text' },
    },
  });
