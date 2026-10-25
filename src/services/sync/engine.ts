/**
 * Sincronización con la nube (opcional, con el consentimiento «Sincronizar una copia cifrada»).
 *
 * - Subir: las filas marcadas `pending` se envían a Supabase y quedan `synced` si no cambiaron entretanto.
 * - Bajar: se traen las filas que cambiaron en la nube desde la última vez y se guardan si son más nuevas.
 * - Conflictos: gana la versión con `updated_at` más reciente. Los borrados viajan como `deleted_at`.
 *
 * La lógica no conoce Supabase: habla con un `RemoteStore`, que en las pruebas es una memoria.
 */
import type { SqlDatabase } from '../../data/db/types';
import { clock } from '../../utils/clock';
import { remoteName, SYNC_TABLES, type SyncTable, toLocal, toRemote } from './tables';

export interface RemoteStore {
  /** Inserta o actualiza filas. Devuelve las claves que fallaron (p. ej. un día duplicado desde otro teléfono). */
  upsert(table: string, key: string, rows: Record<string, unknown>[]): Promise<string[]>;
  /** Filas del usuario con `updated_at` posterior a `since` (todas si es `null`). */
  changedSince(table: string, ownerColumn: string, userId: string, since: string | null): Promise<Record<string, unknown>[]>;
  /** Borra en la nube todas las filas del usuario de esa tabla. */
  deleteAll(table: string, ownerColumn: string, userId: string): Promise<void>;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  failed: number;
  at: string;
}

const CONSENT_SQL = `SELECT accepted FROM consents WHERE user_id = ? AND type = 'cloud_sync' AND deleted_at IS NULL
  ORDER BY decided_at DESC LIMIT 1`;

/** Si la persona aceptó guardar una copia en la nube. */
export async function isSyncEnabled(db: SqlDatabase, userId: string): Promise<boolean> {
  const row = await db.first<{ accepted: number }>(CONSENT_SQL, [userId]);
  return row?.accepted === 1;
}

async function push(db: SqlDatabase, remote: RemoteStore, t: SyncTable, userId: string) {
  const rows = await db.all<Record<string, unknown>>(
    `SELECT * FROM ${t.local} WHERE ${t.owner} = ? AND sync_status = 'pending'`,
    [userId],
  );
  if (rows.length === 0) return { pushed: 0, failed: 0 };
  const failed = new Set(await remote.upsert(remoteName(t), t.key, rows.map((r) => toRemote(t, r))));
  let pushed = 0;
  for (const row of rows) {
    const key = String(row[t.key]);
    if (failed.has(key)) continue;
    // Si la fila cambió mientras se subía, queda pendiente para la próxima vez.
    await db.run(`UPDATE ${t.local} SET sync_status = 'synced' WHERE ${t.key} = ? AND updated_at = ?`, [key, row.updated_at as string]);
    pushed += 1;
  }
  return { pushed, failed: failed.size };
}

async function pull(db: SqlDatabase, remote: RemoteStore, t: SyncTable, userId: string, startedAt: string) {
  const state = await db.first<{ pulled_at: string }>(
    'SELECT pulled_at FROM sync_state WHERE user_id = ? AND table_name = ?',
    [userId, t.local],
  );
  const rows = await remote.changedSince(remoteName(t), t.owner, userId, state?.pulled_at ?? null);
  const columns = new Set((await db.all<{ name: string }>(`PRAGMA table_info(${t.local})`)).map((c) => c.name));
  let pulled = 0;
  for (const remoteRow of rows) {
    const values = toLocal(t, remoteRow);
    const key = String(values[t.key]);
    const current = await db.first<{ updated_at: string; sync_status: string }>(
      `SELECT updated_at, sync_status FROM ${t.local} WHERE ${t.key} = ?`,
      [key],
    );
    const remoteTime = Date.parse(String(values.updated_at));
    if (current && Date.parse(current.updated_at) >= remoteTime) continue;
    const cols = Object.keys(values).filter((c) => columns.has(c));
    if (current) {
      const sets = cols.filter((c) => c !== t.key);
      await db.run(`UPDATE ${t.local} SET ${sets.map((c) => `${c} = ?`).join(', ')} WHERE ${t.key} = ?`, [
        ...sets.map((c) => values[c] as never),
        key,
      ]);
    } else {
      await db.run(
        `INSERT INTO ${t.local} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
        cols.map((c) => values[c] as never),
      );
    }
    pulled += 1;
  }
  await db.run(
    `INSERT INTO sync_state (user_id, table_name, pulled_at) VALUES (?, ?, ?)
     ON CONFLICT (user_id, table_name) DO UPDATE SET pulled_at = excluded.pulled_at`,
    [userId, t.local, startedAt],
  );
  return pulled;
}

/** Sube lo pendiente y baja lo nuevo de todas las tablas, en orden. */
export async function syncNow(db: SqlDatabase, remote: RemoteStore, userId: string): Promise<SyncResult> {
  const startedAt = clock.now().toISOString();
  const result: SyncResult = { pushed: 0, pulled: 0, failed: 0, at: startedAt };
  for (const t of SYNC_TABLES) {
    const { pushed, failed } = await push(db, remote, t, userId);
    result.pushed += pushed;
    result.failed += failed;
  }
  for (const t of SYNC_TABLES) result.pulled += await pull(db, remote, t, userId, startedAt);
  await db.run('UPDATE users SET synced_at = ? WHERE id = ?', [startedAt, userId]);
  return result;
}

/** Al borrar todos los registros conservando la cuenta, también se borran de la nube. */
export async function deleteRemoteRecords(remote: RemoteStore, userId: string): Promise<void> {
  const keep = new Set(['users', 'user_settings', 'consents']);
  for (const t of [...SYNC_TABLES].reverse()) {
    if (!keep.has(t.local)) await remote.deleteAll(remoteName(t), t.owner, userId);
  }
}
