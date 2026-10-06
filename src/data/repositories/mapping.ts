/**
 * Conversión entre objetos de dominio (camelCase, booleanos, listas) y filas SQLite
 * (snake_case, 0/1, JSON en texto).
 */
import type { SqlValue } from '../db/types';

export type ColumnKind = 'text' | 'int' | 'real' | 'bool' | 'json';
export type ColumnMap<T> = { [K in keyof T]?: { column: string; kind: ColumnKind } };

export function toSql(kind: ColumnKind, value: unknown): SqlValue {
  if (value === undefined || value === null) return kind === 'json' ? '[]' : null;
  switch (kind) {
    case 'bool':
      return value ? 1 : 0;
    case 'json':
      return JSON.stringify(value);
    case 'int':
    case 'real':
      return Number(value);
    default:
      return String(value);
  }
}

export function fromSql(kind: ColumnKind, value: unknown): unknown {
  if (value === null || value === undefined) return kind === 'json' ? [] : undefined;
  switch (kind) {
    case 'bool':
      return value === 1 || value === true;
    case 'json':
      try {
        return JSON.parse(String(value));
      } catch {
        return [];
      }
    case 'int':
    case 'real':
      return Number(value);
    default:
      return String(value);
  }
}

export function rowToObject<T>(row: Record<string, unknown>, map: ColumnMap<T>): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [prop, spec] of Object.entries(map) as [string, { column: string; kind: ColumnKind }][]) {
    const value = fromSql(spec.kind, row[spec.column]);
    if (value !== undefined) out[prop] = value;
  }
  return out as Partial<T>;
}

export function objectToColumns<T>(
  data: Partial<T>,
  map: ColumnMap<T>,
): { columns: string[]; values: SqlValue[] } {
  const columns: string[] = [];
  const values: SqlValue[] = [];
  for (const [prop, spec] of Object.entries(map) as [string, { column: string; kind: ColumnKind }][]) {
    columns.push(spec.column);
    values.push(toSql(spec.kind, (data as Record<string, unknown>)[prop]));
  }
  return { columns, values };
}

/** Metadatos comunes que devuelven todos los repositorios. */
export interface RecordMeta {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export function metaFromRow(row: Record<string, unknown>): RecordMeta {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
