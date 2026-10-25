/**
 * Qué se sincroniza y cómo se traduce cada tabla local (SQLite) a su tabla en Supabase (PostgreSQL).
 * El orden respeta las claves foráneas: padres antes que hijos, al subir y al bajar.
 */
export interface SyncTable {
  /** Tabla local. */
  local: string;
  /** Tabla en Supabase (por defecto, la misma). */
  remote?: string;
  /** Clave primaria (también la columna que identifica al usuario si es `user_id`). */
  key: 'id' | 'user_id';
  /** Columna con el id del usuario. */
  owner: 'user_id' | 'id';
  /** 0/1 en SQLite, boolean en PostgreSQL. */
  bools?: string[];
  /** JSON en texto en SQLite, text[] en PostgreSQL. */
  arrays?: string[];
  /** JSON en texto en SQLite, jsonb en PostgreSQL. */
  json?: string[];
  /** Columnas solo locales que no existen en la nube. */
  localOnly?: string[];
}

export const SYNC_TABLES: SyncTable[] = [
  {
    local: 'users',
    remote: 'profiles',
    key: 'id',
    owner: 'id',
    bools: ['pregnant_or_postpartum'],
    arrays: ['diagnoses'],
    localOnly: ['email', 'health_import_at', 'synced_at'],
  },
  { local: 'user_settings', key: 'user_id', owner: 'user_id', bools: ['biometric_lock'], json: ['reminders'] },
  { local: 'consents', key: 'id', owner: 'user_id', bools: ['accepted'] },
  { local: 'emergency_contacts', key: 'id', owner: 'user_id' },
  {
    local: 'headache_episodes',
    key: 'id',
    owner: 'user_id',
    bools: ['ongoing', 'sudden_onset', 'head_trauma'],
    arrays: ['locations', 'qualities'],
  },
  { local: 'medications', key: 'id', owner: 'user_id', bools: ['prescribed_by_professional'] },
  { local: 'episode_events', key: 'id', owner: 'user_id' },
  { local: 'symptoms', key: 'id', owner: 'user_id' },
  { local: 'aura_details', key: 'id', owner: 'user_id', arrays: ['types'] },
  { local: 'triggers', key: 'id', owner: 'user_id' },
  { local: 'alarm_flags', key: 'id', owner: 'user_id' },
  { local: 'sleep_records', key: 'id', owner: 'user_id', bools: ['insomnia', 'restorative'] },
  { local: 'hydration_records', key: 'id', owner: 'user_id' },
  { local: 'meal_records', key: 'id', owner: 'user_id', bools: ['fasting'], arrays: ['foods'] },
  { local: 'daily_records', key: 'id', owner: 'user_id', bools: ['pain_free', 'menstruation'] },
];

export const remoteName = (t: SyncTable) => t.remote ?? t.local;

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T/;
const parseList = (v: unknown) => {
  try {
    const list = JSON.parse(String(v ?? '[]'));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

/** Fila local → fila remota. */
export function toRemote(t: SyncTable, row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [column, value] of Object.entries(row)) {
    if (column === 'sync_status' || t.localOnly?.includes(column)) continue;
    if (t.bools?.includes(column)) out[column] = value === null || value === undefined ? null : value === 1 || value === true;
    else if (t.arrays?.includes(column)) out[column] = parseList(value);
    else if (t.json?.includes(column)) out[column] = value === null ? null : JSON.parse(String(value));
    else out[column] = value;
  }
  return out;
}

/** Fila remota → valores para la fila local (marcada como sincronizada). */
export function toLocal(t: SyncTable, row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [column, value] of Object.entries(row)) {
    if (t.bools?.includes(column)) out[column] = value === null || value === undefined ? null : value ? 1 : 0;
    else if (t.arrays?.includes(column) || t.json?.includes(column)) out[column] = JSON.stringify(value ?? (t.json?.includes(column) ? {} : []));
    else if (column === 'time' && typeof value === 'string') out[column] = value.slice(0, 5);
    else if (typeof value === 'string' && ISO_INSTANT.test(value)) out[column] = new Date(value).toISOString();
    else out[column] = value;
  }
  out.sync_status = 'synced';
  return out;
}
