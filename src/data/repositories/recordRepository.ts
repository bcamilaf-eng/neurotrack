/**
 * Repositorio genérico para registros simples de una sola tabla
 * (medicación, sueño, hidratación, alimentación, estado diario, contactos).
 *
 * Garantiza para todos ellos:
 * - validación con el esquema de dominio antes de escribir;
 * - aislamiento por usuario en cada consulta;
 * - borrado lógico (`deleted_at`) y marca de sincronización pendiente;
 * - opcionalmente, un único registro por día (`uniquePerDay`).
 */
import type { z } from 'zod';
import { DuplicateError, NotFoundError, parseOrThrow } from '../../domain/errors';
import { clock } from '../../utils/clock';
import { newId } from '../../utils/id';
import type { SqlDatabase, SqlValue } from '../db/types';
import { type ColumnMap, metaFromRow, objectToColumns, type RecordMeta, rowToObject } from './mapping';

export interface RecordRepositoryConfig<S extends z.ZodType> {
  table: string;
  schema: S;
  columns: ColumnMap<z.output<S>>;
  /** Columnas calculadas a partir de los datos validados (p. ej. `hours` del sueño). */
  derived?: (data: z.output<S>) => Record<string, SqlValue>;
  /** Día de calendario al que pertenece el registro. */
  dateOf: (data: z.output<S>) => string;
  uniquePerDay?: { message: string };
  /** Columna usada para ordenar dentro del día. */
  orderBy?: string;
  label: string;
}

export type StoredRecord<T> = T & RecordMeta & { date: string };

export class RecordRepository<S extends z.ZodType> {
  constructor(
    private readonly db: SqlDatabase,
    private readonly config: RecordRepositoryConfig<S>,
  ) {}

  private hydrate(row: Record<string, unknown>): StoredRecord<z.output<S>> {
    return {
      ...(rowToObject(row, this.config.columns) as object),
      ...metaFromRow(row),
      date: String(row.date),
    } as StoredRecord<z.output<S>>;
  }

  private async assertDayFree(userId: string, date: string, exceptId?: string) {
    if (!this.config.uniquePerDay) return;
    const existing = await this.db.first<{ id: string }>(
      `SELECT id FROM ${this.config.table}
       WHERE user_id = ? AND date = ? AND deleted_at IS NULL AND id != ?`,
      [userId, date, exceptId ?? ''],
    );
    if (existing) throw new DuplicateError(this.config.uniquePerDay.message, existing.id);
  }

  async create(userId: string, input: z.input<S>): Promise<StoredRecord<z.output<S>>> {
    const data = parseOrThrow(this.config.schema, input);
    const date = this.config.dateOf(data);
    await this.assertDayFree(userId, date);
    const { columns, values } = objectToColumns(data, this.config.columns);
    const derived = this.config.derived?.(data) ?? {};
    const now = clock.now().toISOString();
    const id = newId();
    const allColumns = ['id', 'user_id', 'created_at', 'updated_at', 'date', ...columns, ...Object.keys(derived)];
    const allValues: SqlValue[] = [id, userId, now, now, date, ...values, ...Object.values(derived)];
    if (columns.includes('date')) {
      // La fecha ya viene en los datos: evita la columna duplicada.
      const dupIndex = allColumns.lastIndexOf('date');
      allColumns.splice(dupIndex, 1);
      allValues.splice(dupIndex, 1);
    }
    await this.db.run(
      `INSERT INTO ${this.config.table} (${allColumns.join(', ')})
       VALUES (${allColumns.map(() => '?').join(', ')})`,
      allValues,
    );
    return this.getOrThrow(userId, id);
  }

  async update(userId: string, id: string, input: z.input<S>): Promise<StoredRecord<z.output<S>>> {
    await this.getOrThrow(userId, id);
    const data = parseOrThrow(this.config.schema, input);
    const date = this.config.dateOf(data);
    await this.assertDayFree(userId, date, id);
    const { columns, values } = objectToColumns(data, this.config.columns);
    const derived = this.config.derived?.(data) ?? {};
    const sets = [...columns, ...Object.keys(derived)];
    const setValues: SqlValue[] = [...values, ...Object.values(derived)];
    if (!columns.includes('date')) {
      sets.push('date');
      setValues.push(date);
    }
    await this.db.run(
      `UPDATE ${this.config.table}
       SET ${sets.map((c) => `${c} = ?`).join(', ')}, updated_at = ?, sync_status = 'pending'
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [...setValues, clock.now().toISOString(), id, userId],
    );
    return this.getOrThrow(userId, id);
  }

  /** Inserta o reemplaza el registro del día (para formularios diarios). */
  async upsertForDay(userId: string, input: z.input<S>): Promise<StoredRecord<z.output<S>>> {
    const data = parseOrThrow(this.config.schema, input);
    const existing = await this.getByDate(userId, this.config.dateOf(data));
    return existing ? this.update(userId, existing.id, input) : this.create(userId, input);
  }

  async remove(userId: string, id: string): Promise<void> {
    const now = clock.now().toISOString();
    const result = await this.db.run(
      `UPDATE ${this.config.table} SET deleted_at = ?, updated_at = ?, sync_status = 'pending'
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [now, now, id, userId],
    );
    if (result.changes === 0) throw new NotFoundError(this.config.label);
  }

  async get(userId: string, id: string): Promise<StoredRecord<z.output<S>> | null> {
    const row = await this.db.first<Record<string, unknown>>(
      `SELECT * FROM ${this.config.table} WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [id, userId],
    );
    return row ? this.hydrate(row) : null;
  }

  async getOrThrow(userId: string, id: string): Promise<StoredRecord<z.output<S>>> {
    const record = await this.get(userId, id);
    if (!record) throw new NotFoundError(this.config.label);
    return record;
  }

  async getByDate(userId: string, date: string): Promise<StoredRecord<z.output<S>> | null> {
    const row = await this.db.first<Record<string, unknown>>(
      `SELECT * FROM ${this.config.table}
       WHERE user_id = ? AND date = ? AND deleted_at IS NULL
       ORDER BY ${this.config.orderBy ?? 'created_at'} LIMIT 1`,
      [userId, date],
    );
    return row ? this.hydrate(row) : null;
  }

  /** Registros entre dos días locales, ambos incluidos. */
  async listBetween(userId: string, fromDate: string, toDate: string): Promise<StoredRecord<z.output<S>>[]> {
    const rows = await this.db.all<Record<string, unknown>>(
      `SELECT * FROM ${this.config.table}
       WHERE user_id = ? AND date BETWEEN ? AND ? AND deleted_at IS NULL
       ORDER BY date, ${this.config.orderBy ?? 'created_at'}`,
      [userId, fromDate, toDate],
    );
    return rows.map((row) => this.hydrate(row));
  }
}
