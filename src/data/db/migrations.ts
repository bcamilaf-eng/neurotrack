/**
 * Migraciones de la base local (SQLite / SQLCipher).
 *
 * Cada migración se aplica una sola vez y en orden; la versión aplicada se guarda en
 * `PRAGMA user_version`. Nunca se edita una migración publicada: se añade una nueva.
 *
 * Columnas comunes de todas las tablas clínicas:
 * - `id` UUID generado en el dispositivo (permite crear registros sin conexión).
 * - `user_id` dueño del registro.
 * - `created_at` / `updated_at` instantes ISO en UTC.
 * - `deleted_at` borrado lógico, necesario para propagar borrados al sincronizar.
 * - `sync_status` `pending` hasta que el servidor confirma el cambio.
 */
import type { SqlDatabase } from './types';

const COMMON = `
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced'))`;

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'esquema_inicial',
    sql: `
CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  birth_date TEXT,
  sex TEXT CHECK (sex IN ('female', 'male', 'other', 'undisclosed')),
  weight_kg REAL CHECK (weight_kg BETWEEN 20 AND 300),
  height_cm REAL CHECK (height_cm BETWEEN 50 AND 250),
  country TEXT,
  tracking_notes TEXT,
  pregnant_or_postpartum INTEGER CHECK (pregnant_or_postpartum IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('system', 'light', 'dark')),
  text_scale REAL NOT NULL DEFAULT 1 CHECK (text_scale BETWEEN 0.8 AND 1.6),
  biometric_lock INTEGER NOT NULL DEFAULT 0 CHECK (biometric_lock IN (0, 1)),
  lock_after_minutes INTEGER NOT NULL DEFAULT 5 CHECK (lock_after_minutes BETWEEN 0 AND 60),
  reminders TEXT NOT NULL DEFAULT '{}',
  language TEXT NOT NULL DEFAULT 'es',
  updated_at TEXT NOT NULL
);

CREATE TABLE emergency_contacts (${COMMON},
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT
);

CREATE TABLE consents (${COMMON},
  type TEXT NOT NULL CHECK (type IN ('terms', 'health_data', 'cloud_sync', 'pattern_analysis')),
  version TEXT NOT NULL,
  accepted INTEGER NOT NULL CHECK (accepted IN (0, 1)),
  decided_at TEXT NOT NULL
);
CREATE INDEX consents_user_type ON consents (user_id, type, decided_at);

CREATE TABLE headache_episodes (${COMMON},
  date TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  ongoing INTEGER NOT NULL DEFAULT 0 CHECK (ongoing IN (0, 1)),
  duration_min INTEGER CHECK (duration_min IS NULL OR duration_min > 0),
  type TEXT NOT NULL,
  type_other TEXT,
  intensity INTEGER NOT NULL CHECK (intensity BETWEEN 0 AND 10),
  max_intensity INTEGER NOT NULL CHECK (max_intensity BETWEEN 0 AND 10),
  locations TEXT NOT NULL DEFAULT '[]',
  location_other TEXT,
  qualities TEXT NOT NULL DEFAULT '[]',
  quality_other TEXT,
  notes TEXT,
  CHECK (ended_at IS NULL OR ended_at > started_at),
  CHECK ((ongoing = 1 AND ended_at IS NULL) OR (ongoing = 0 AND ended_at IS NOT NULL))
);
CREATE INDEX episodes_user_date ON headache_episodes (user_id, date);
CREATE INDEX episodes_user_start ON headache_episodes (user_id, started_at);

CREATE TABLE episode_events (${COMMON},
  episode_id TEXT NOT NULL REFERENCES headache_episodes(id) ON DELETE CASCADE,
  at TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('pain', 'medication', 'note')),
  intensity INTEGER CHECK (intensity IS NULL OR intensity BETWEEN 0 AND 10),
  medication_id TEXT,
  note TEXT
);
CREATE INDEX events_episode ON episode_events (episode_id, at);

CREATE TABLE symptoms (${COMMON},
  episode_id TEXT NOT NULL REFERENCES headache_episodes(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  intensity INTEGER CHECK (intensity IS NULL OR intensity BETWEEN 0 AND 10),
  duration_min INTEGER CHECK (duration_min IS NULL OR duration_min >= 0)
);
CREATE INDEX symptoms_episode ON symptoms (episode_id);

CREATE TABLE aura_details (${COMMON},
  episode_id TEXT NOT NULL REFERENCES headache_episodes(id) ON DELETE CASCADE,
  types TEXT NOT NULL DEFAULT '[]',
  duration_min INTEGER CHECK (duration_min IS NULL OR duration_min >= 0)
);
CREATE UNIQUE INDEX aura_episode ON aura_details (episode_id) WHERE deleted_at IS NULL;

CREATE TABLE triggers (${COMMON},
  episode_id TEXT NOT NULL REFERENCES headache_episodes(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  detail TEXT
);
CREATE INDEX triggers_episode ON triggers (episode_id);

CREATE TABLE medications (${COMMON},
  episode_id TEXT REFERENCES headache_episodes(id) ON DELETE SET NULL,
  date TEXT NOT NULL,
  taken_at TEXT NOT NULL,
  name TEXT NOT NULL,
  dose_value REAL NOT NULL CHECK (dose_value > 0),
  dose_unit TEXT NOT NULL,
  reason TEXT,
  prescribed_by_professional INTEGER NOT NULL DEFAULT 0 CHECK (prescribed_by_professional IN (0, 1)),
  response TEXT CHECK (response IS NULL OR response IN ('none', 'partial', 'complete')),
  minutes_to_relief INTEGER CHECK (minutes_to_relief IS NULL OR minutes_to_relief >= 0),
  adverse_effects TEXT
);
CREATE INDEX medications_user_date ON medications (user_id, date);
CREATE INDEX medications_episode ON medications (episode_id);

CREATE TABLE sleep_records (${COMMON},
  date TEXT NOT NULL,
  bedtime_at TEXT NOT NULL,
  wake_at TEXT NOT NULL,
  hours REAL NOT NULL CHECK (hours > 0 AND hours <= 24),
  quality INTEGER NOT NULL CHECK (quality BETWEEN 1 AND 5),
  awakenings INTEGER NOT NULL DEFAULT 0 CHECK (awakenings >= 0),
  insomnia INTEGER NOT NULL DEFAULT 0 CHECK (insomnia IN (0, 1)),
  restorative INTEGER CHECK (restorative IS NULL OR restorative IN (0, 1)),
  notes TEXT
);
CREATE UNIQUE INDEX sleep_user_date ON sleep_records (user_id, date) WHERE deleted_at IS NULL;

CREATE TABLE hydration_records (${COMMON},
  date TEXT NOT NULL,
  amount_ml INTEGER NOT NULL CHECK (amount_ml BETWEEN 0 AND 10000),
  glasses INTEGER CHECK (glasses IS NULL OR glasses BETWEEN 0 AND 40),
  perceived INTEGER CHECK (perceived IS NULL OR perceived BETWEEN 1 AND 5),
  goal_ml INTEGER NOT NULL DEFAULT 2000
);
CREATE UNIQUE INDEX hydration_user_date ON hydration_records (user_id, date) WHERE deleted_at IS NULL;

CREATE TABLE meal_records (${COMMON},
  date TEXT NOT NULL,
  meal_type TEXT NOT NULL,
  time TEXT,
  foods TEXT NOT NULL DEFAULT '[]',
  fasting INTEGER NOT NULL DEFAULT 0 CHECK (fasting IN (0, 1)),
  fasting_hours REAL,
  notes TEXT
);
CREATE INDEX meals_user_date ON meal_records (user_id, date);

CREATE TABLE daily_records (${COMMON},
  date TEXT NOT NULL,
  stress INTEGER CHECK (stress IS NULL OR stress BETWEEN 1 AND 10),
  anxiety INTEGER CHECK (anxiety IS NULL OR anxiety BETWEEN 1 AND 10),
  mood INTEGER CHECK (mood IS NULL OR mood BETWEEN 1 AND 5),
  workload INTEGER CHECK (workload IS NULL OR workload BETWEEN 1 AND 5),
  stressful_situations TEXT,
  pain_free INTEGER NOT NULL DEFAULT 0 CHECK (pain_free IN (0, 1)),
  notes TEXT
);
CREATE UNIQUE INDEX daily_user_date ON daily_records (user_id, date) WHERE deleted_at IS NULL;

CREATE TABLE alarm_flags (${COMMON},
  episode_id TEXT NOT NULL REFERENCES headache_episodes(id) ON DELETE CASCADE,
  signal TEXT NOT NULL,
  rules_version TEXT NOT NULL,
  detected_at TEXT NOT NULL,
  shown_at TEXT,
  acknowledged_at TEXT
);
CREATE INDEX alarm_flags_episode ON alarm_flags (episode_id);
`,
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

/** Aplica, dentro de una transacción cada una, las migraciones pendientes. */
export async function migrate(db: SqlDatabase): Promise<number> {
  await db.exec('PRAGMA foreign_keys = ON;');
  const row = await db.first<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    await db.transaction(async () => {
      await db.exec(migration.sql);
      await db.exec(`PRAGMA user_version = ${migration.version};`);
    });
  }
  return LATEST_SCHEMA_VERSION;
}

/** Tablas clínicas con columnas comunes, en orden seguro de borrado (hijas primero). */
export const CLINICAL_TABLES = [
  'alarm_flags',
  'episode_events',
  'symptoms',
  'aura_details',
  'triggers',
  'medications',
  'headache_episodes',
  'sleep_records',
  'hydration_records',
  'meal_records',
  'daily_records',
  'emergency_contacts',
  'consents',
] as const;
export type ClinicalTable = (typeof CLINICAL_TABLES)[number];
