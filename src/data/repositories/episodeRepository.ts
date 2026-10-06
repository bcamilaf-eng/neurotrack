/**
 * Repositorio de episodios con sus síntomas, aura, desencadenantes y línea temporal.
 *
 * Un episodio y sus hijos se escriben siempre en una única transacción: o se guarda
 * todo, o no se guarda nada.
 */
import {
  type EpisodeData,
  type EpisodeEventData,
  type EpisodeEventInput,
  type EpisodeInput,
  episodeDuration,
  episodeEventInputSchema,
  episodeInputSchema,
} from '../../domain/entities/episode';
import { DuplicateError, NotFoundError, ValidationError, parseOrThrow } from '../../domain/errors';
import { clock } from '../../utils/clock';
import { newId } from '../../utils/id';
import { toLocalDate } from '../../utils/time';
import type { SqlDatabase, SqlValue } from '../db/types';
import { type ColumnMap, fromSql, metaFromRow, type RecordMeta, rowToObject } from './mapping';

export type EpisodeRecord = EpisodeData &
  RecordMeta & {
    date: string;
    durationMin: number | null;
    maxIntensity: number;
  };

export type EpisodeEventRecord = EpisodeEventData & RecordMeta & { episodeId: string };

export interface SaveOptions {
  /** Guardar aunque se solape con otro episodio (el usuario lo confirmó). */
  allowOverlap?: boolean;
}

const OPEN_END = '9999-12-31T23:59:59.999Z';

const EPISODE_COLUMNS: ColumnMap<EpisodeData> = {
  startedAt: { column: 'started_at', kind: 'text' },
  endedAt: { column: 'ended_at', kind: 'text' },
  ongoing: { column: 'ongoing', kind: 'bool' },
  type: { column: 'type', kind: 'text' },
  typeOther: { column: 'type_other', kind: 'text' },
  intensity: { column: 'intensity', kind: 'int' },
  locations: { column: 'locations', kind: 'json' },
  locationOther: { column: 'location_other', kind: 'text' },
  qualities: { column: 'qualities', kind: 'json' },
  qualityOther: { column: 'quality_other', kind: 'text' },
  notes: { column: 'notes', kind: 'text' },
};

const EVENT_COLUMNS: ColumnMap<EpisodeEventData> = {
  at: { column: 'at', kind: 'text' },
  kind: { column: 'kind', kind: 'text' },
  intensity: { column: 'intensity', kind: 'int' },
  medicationId: { column: 'medication_id', kind: 'text' },
  note: { column: 'note', kind: 'text' },
};

const CHILD_TABLES = ['symptoms', 'aura_details', 'triggers'] as const;

export class EpisodeRepository {
  constructor(private readonly db: SqlDatabase) {}

  async create(userId: string, input: EpisodeInput, options: SaveOptions = {}): Promise<EpisodeRecord> {
    const data = parseOrThrow(episodeInputSchema, input);
    if (!options.allowOverlap) await this.assertNoOverlap(userId, data);
    const id = newId();
    const now = clock.now().toISOString();
    await this.db.transaction(async () => {
      await this.db.run(
        `INSERT INTO headache_episodes (
           id, user_id, created_at, updated_at, date, started_at, ended_at, ongoing, duration_min,
           type, type_other, intensity, max_intensity, locations, location_other, qualities,
           quality_other, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, userId, now, now, ...this.episodeValues(data, data.intensity)],
      );
      await this.writeChildren(userId, id, data, now);
    });
    return this.getOrThrow(userId, id);
  }

  async update(
    userId: string,
    id: string,
    input: EpisodeInput,
    options: SaveOptions = {},
  ): Promise<EpisodeRecord> {
    const current = await this.getOrThrow(userId, id);
    const data = parseOrThrow(episodeInputSchema, input);
    if (!options.allowOverlap) await this.assertNoOverlap(userId, data, id);
    const events = await this.listEvents(userId, id);
    const maxIntensity = Math.max(data.intensity, ...events.map((e) => e.intensity ?? 0));
    const now = clock.now().toISOString();
    await this.db.transaction(async () => {
      await this.db.run(
        `UPDATE headache_episodes SET
           date = ?, started_at = ?, ended_at = ?, ongoing = ?, duration_min = ?, type = ?,
           type_other = ?, intensity = ?, max_intensity = ?, locations = ?, location_other = ?,
           qualities = ?, quality_other = ?, notes = ?, updated_at = ?, sync_status = 'pending'
         WHERE id = ? AND user_id = ?`,
        [...this.episodeValues(data, maxIntensity), now, current.id, userId],
      );
      for (const table of CHILD_TABLES) {
        await this.db.run(
          `UPDATE ${table} SET deleted_at = ?, updated_at = ?, sync_status = 'pending'
           WHERE episode_id = ? AND user_id = ? AND deleted_at IS NULL`,
          [now, now, id, userId],
        );
      }
      await this.writeChildren(userId, id, data, now);
    });
    return this.getOrThrow(userId, id);
  }

  /** Cierra un episodio en curso con su hora de término. */
  async close(userId: string, id: string, endedAt: string): Promise<EpisodeRecord> {
    const current = await this.getOrThrow(userId, id);
    return this.update(userId, id, { ...this.toInput(current), ongoing: false, endedAt }, { allowOverlap: true });
  }

  /** Borrado lógico del episodio y de todo lo que cuelga de él. */
  async remove(userId: string, id: string): Promise<void> {
    await this.getOrThrow(userId, id);
    const now = clock.now().toISOString();
    await this.db.transaction(async () => {
      for (const table of [...CHILD_TABLES, 'episode_events', 'alarm_flags']) {
        await this.db.run(
          `UPDATE ${table} SET deleted_at = ?, updated_at = ?, sync_status = 'pending'
           WHERE episode_id = ? AND user_id = ? AND deleted_at IS NULL`,
          [now, now, id, userId],
        );
      }
      // La medicación sigue existiendo como registro propio, pero se desvincula.
      await this.db.run(
        `UPDATE medications SET episode_id = NULL, updated_at = ?, sync_status = 'pending'
         WHERE episode_id = ? AND user_id = ?`,
        [now, id, userId],
      );
      await this.db.run(
        `UPDATE headache_episodes SET deleted_at = ?, updated_at = ?, sync_status = 'pending'
         WHERE id = ? AND user_id = ?`,
        [now, now, id, userId],
      );
    });
  }

  async get(userId: string, id: string): Promise<EpisodeRecord | null> {
    const row = await this.db.first<Record<string, unknown>>(
      `SELECT * FROM headache_episodes WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [id, userId],
    );
    return row ? this.hydrate(row) : null;
  }

  async getOrThrow(userId: string, id: string): Promise<EpisodeRecord> {
    const record = await this.get(userId, id);
    if (!record) throw new NotFoundError('El episodio');
    return record;
  }

  /** Episodios entre dos días locales (ambos incluidos), del más antiguo al más reciente. */
  async listBetween(userId: string, fromDate: string, toDate: string): Promise<EpisodeRecord[]> {
    const rows = await this.db.all<Record<string, unknown>>(
      `SELECT * FROM headache_episodes
       WHERE user_id = ? AND date BETWEEN ? AND ? AND deleted_at IS NULL
       ORDER BY started_at`,
      [userId, fromDate, toDate],
    );
    return Promise.all(rows.map((row) => this.hydrate(row)));
  }

  async latest(userId: string): Promise<EpisodeRecord | null> {
    const row = await this.db.first<Record<string, unknown>>(
      `SELECT * FROM headache_episodes WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY started_at DESC LIMIT 1`,
      [userId],
    );
    return row ? this.hydrate(row) : null;
  }

  async ongoing(userId: string): Promise<EpisodeRecord[]> {
    const rows = await this.db.all<Record<string, unknown>>(
      `SELECT * FROM headache_episodes WHERE user_id = ? AND ongoing = 1 AND deleted_at IS NULL
       ORDER BY started_at DESC`,
      [userId],
    );
    return Promise.all(rows.map((row) => this.hydrate(row)));
  }

  // ── Línea temporal ────────────────────────────────────────────────────────

  async addEvent(userId: string, episodeId: string, input: EpisodeEventInput): Promise<EpisodeEventRecord> {
    const episode = await this.getOrThrow(userId, episodeId);
    const data = parseOrThrow(episodeEventInputSchema, input);
    if (Date.parse(data.at) < Date.parse(episode.startedAt)) {
      throw new ValidationError({ at: 'La actualización no puede ser anterior al inicio del episodio.' });
    }
    if (episode.endedAt && Date.parse(data.at) > Date.parse(episode.endedAt)) {
      throw new ValidationError({ at: 'La actualización no puede ser posterior al fin del episodio.' });
    }
    const id = newId();
    const now = clock.now().toISOString();
    await this.db.transaction(async () => {
      await this.db.run(
        `INSERT INTO episode_events (id, user_id, created_at, updated_at, episode_id, at, kind, intensity, medication_id, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, userId, now, now, episodeId, data.at, data.kind, data.intensity ?? null, data.medicationId ?? null, data.note ?? null],
      );
      if (data.kind === 'pain' && data.intensity !== undefined && data.intensity > episode.maxIntensity) {
        await this.db.run(
          `UPDATE headache_episodes SET max_intensity = ?, updated_at = ?, sync_status = 'pending'
           WHERE id = ? AND user_id = ?`,
          [data.intensity, now, episodeId, userId],
        );
      }
    });
    const events = await this.listEvents(userId, episodeId);
    return events.find((e) => e.id === id)!;
  }

  async removeEvent(userId: string, episodeId: string, eventId: string): Promise<void> {
    const now = clock.now().toISOString();
    const result = await this.db.run(
      `UPDATE episode_events SET deleted_at = ?, updated_at = ?, sync_status = 'pending'
       WHERE id = ? AND episode_id = ? AND user_id = ? AND deleted_at IS NULL`,
      [now, now, eventId, episodeId, userId],
    );
    if (result.changes === 0) throw new NotFoundError('La actualización');
    await this.recomputeMaxIntensity(userId, episodeId);
  }

  async listEvents(userId: string, episodeId: string): Promise<EpisodeEventRecord[]> {
    const rows = await this.db.all<Record<string, unknown>>(
      `SELECT * FROM episode_events WHERE episode_id = ? AND user_id = ? AND deleted_at IS NULL ORDER BY at`,
      [episodeId, userId],
    );
    return rows.map((row) => ({
      ...(rowToObject(row, EVENT_COLUMNS) as EpisodeEventData),
      ...metaFromRow(row),
      episodeId: String(row.episode_id),
    }));
  }

  // ── Interno ──────────────────────────────────────────────────────────────

  private async recomputeMaxIntensity(userId: string, episodeId: string) {
    const episode = await this.getOrThrow(userId, episodeId);
    const events = await this.listEvents(userId, episodeId);
    const max = Math.max(episode.intensity, ...events.map((e) => e.intensity ?? 0));
    await this.db.run(
      `UPDATE headache_episodes SET max_intensity = ?, updated_at = ?, sync_status = 'pending'
       WHERE id = ? AND user_id = ?`,
      [max, clock.now().toISOString(), episodeId, userId],
    );
  }

  private episodeValues(data: EpisodeData, maxIntensity: number): SqlValue[] {
    return [
      toLocalDate(new Date(data.startedAt)),
      data.startedAt,
      data.endedAt ?? null,
      data.ongoing ? 1 : 0,
      episodeDuration(data),
      data.type,
      data.typeOther ?? null,
      data.intensity,
      maxIntensity,
      JSON.stringify(data.locations),
      data.locationOther ?? null,
      JSON.stringify(data.qualities),
      data.qualityOther ?? null,
      data.notes ?? null,
    ];
  }

  private async writeChildren(userId: string, episodeId: string, data: EpisodeData, now: string) {
    for (const symptom of data.symptoms) {
      await this.db.run(
        `INSERT INTO symptoms (id, user_id, created_at, updated_at, episode_id, type, intensity, duration_min)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId(), userId, now, now, episodeId, symptom.type, symptom.intensity ?? null, symptom.durationMin ?? null],
      );
    }
    if (data.aura) {
      await this.db.run(
        `INSERT INTO aura_details (id, user_id, created_at, updated_at, episode_id, types, duration_min)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [newId(), userId, now, now, episodeId, JSON.stringify(data.aura.types), data.aura.durationMin ?? null],
      );
    }
    for (const trigger of data.triggers) {
      await this.db.run(
        `INSERT INTO triggers (id, user_id, created_at, updated_at, episode_id, type, detail)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [newId(), userId, now, now, episodeId, trigger.type, trigger.detail ?? null],
      );
    }
  }

  private async assertNoOverlap(userId: string, data: EpisodeData, exceptId?: string) {
    // Los episodios en curso siguen abiertos: su fin es «nunca» hasta que se cierran.
    const end = data.endedAt ?? OPEN_END;
    const clash = await this.db.first<{ id: string }>(
      `SELECT id FROM headache_episodes
       WHERE user_id = ? AND deleted_at IS NULL AND id != ?
         AND started_at < ?
         AND COALESCE(ended_at, ?) > ?
       LIMIT 1`,
      [userId, exceptId ?? '', end, OPEN_END, data.startedAt],
    );
    if (clash) {
      throw new DuplicateError(
        'Ya hay un episodio registrado en ese horario. ¿Quieres editarlo o guardar este igualmente?',
        clash.id,
      );
    }
  }

  private async hydrate(row: Record<string, unknown>): Promise<EpisodeRecord> {
    const id = String(row.id);
    const userId = String(row.user_id);
    const [symptomRows, auraRow, triggerRows] = await Promise.all([
      this.db.all<Record<string, unknown>>(
        `SELECT * FROM symptoms WHERE episode_id = ? AND user_id = ? AND deleted_at IS NULL ORDER BY created_at`,
        [id, userId],
      ),
      this.db.first<Record<string, unknown>>(
        `SELECT * FROM aura_details WHERE episode_id = ? AND user_id = ? AND deleted_at IS NULL`,
        [id, userId],
      ),
      this.db.all<Record<string, unknown>>(
        `SELECT * FROM triggers WHERE episode_id = ? AND user_id = ? AND deleted_at IS NULL ORDER BY created_at`,
        [id, userId],
      ),
    ]);
    const base = rowToObject(row, EPISODE_COLUMNS) as EpisodeData;
    return {
      ...base,
      ...metaFromRow(row),
      date: String(row.date),
      durationMin: row.duration_min === null ? null : Number(row.duration_min),
      maxIntensity: Number(row.max_intensity),
      symptoms: symptomRows.map((s) => ({
        type: s.type as EpisodeData['symptoms'][number]['type'],
        intensity: fromSql('int', s.intensity) as number | undefined,
        durationMin: fromSql('int', s.duration_min) as number | undefined,
      })),
      aura: auraRow
        ? {
            types: fromSql('json', auraRow.types) as NonNullable<EpisodeData['aura']>['types'],
            durationMin: fromSql('int', auraRow.duration_min) as number | undefined,
          }
        : undefined,
      triggers: triggerRows.map((t) => ({
        type: t.type as EpisodeData['triggers'][number]['type'],
        detail: fromSql('text', t.detail) as string | undefined,
      })),
    };
  }

  /** Convierte un registro guardado de vuelta en datos de formulario (para editar). */
  toInput(record: EpisodeRecord): EpisodeInput {
    return {
      startedAt: record.startedAt,
      endedAt: record.endedAt,
      ongoing: record.ongoing,
      type: record.type,
      typeOther: record.typeOther,
      intensity: record.intensity,
      locations: record.locations,
      locationOther: record.locationOther,
      qualities: record.qualities,
      qualityOther: record.qualityOther,
      symptoms: record.symptoms,
      aura: record.aura,
      triggers: record.triggers,
      notes: record.notes,
    };
  }
}
