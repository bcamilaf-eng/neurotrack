/**
 * Base SQLite en memoria (better-sqlite3) con el mismo contrato que la de la app.
 * Las pruebas de repositorios corren contra SQLite real, con las migraciones reales.
 */
import Database from 'better-sqlite3';
import { migrate } from '../../src/data/db/migrations';
import type { SqlDatabase, SqlParams } from '../../src/data/db/types';

export async function createTestDatabase(): Promise<SqlDatabase & { raw: Database.Database }> {
  const raw = new Database(':memory:');
  const db = {
    raw,
    exec: async (sql: string) => {
      raw.exec(sql);
    },
    run: async (sql: string, params: SqlParams = []) => ({ changes: raw.prepare(sql).run(...params).changes }),
    all: async <T>(sql: string, params: SqlParams = []) => raw.prepare(sql).all(...params) as T[],
    first: async <T>(sql: string, params: SqlParams = []) =>
      ((raw.prepare(sql).get(...params) as T | undefined) ?? null),
    transaction: async <T>(task: () => Promise<T>) => {
      raw.exec('BEGIN');
      try {
        const value = await task();
        raw.exec('COMMIT');
        return value;
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      }
    },
    close: async () => {
      raw.close();
    },
  };
  await migrate(db);
  return db;
}
