/**
 * Implementación de `SqlDatabase` sobre expo-sqlite, con cifrado SQLCipher.
 *
 * La clave de cifrado es aleatoria (256 bits), se genera en el primer arranque y
 * vive solo en el almacén seguro del sistema (Keychain / Keystore). En Expo Go, que
 * no incluye SQLCipher, `PRAGMA key` no tiene efecto: usa una build de desarrollo
 * para probar el cifrado real.
 */
import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { migrate } from './migrations';
import type { SqlDatabase, SqlParams } from './types';

export const DB_NAME = 'neurotrack.db';
const KEY_ITEM = 'neurotrack.db.key.v1';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function getOrCreateKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(KEY_ITEM);
  if (existing) return existing;
  const key = toHex(Crypto.getRandomBytes(32));
  await SecureStore.setItemAsync(KEY_ITEM, key, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return key;
}

export function wrapExpoDatabase(db: SQLite.SQLiteDatabase): SqlDatabase {
  return {
    exec: (sql) => db.execAsync(sql),
    run: async (sql, params: SqlParams = []) => {
      const result = await db.runAsync(sql, params);
      return { changes: result.changes };
    },
    all: (sql, params: SqlParams = []) => db.getAllAsync(sql, params),
    first: (sql, params: SqlParams = []) => db.getFirstAsync(sql, params),
    transaction: async <T>(task: () => Promise<T>) => {
      let value: T | undefined;
      await db.withTransactionAsync(async () => {
        value = await task();
      });
      return value as T;
    },
    close: () => db.closeAsync(),
  };
}

let instance: Promise<SqlDatabase> | null = null;

/** Abre (una sola vez) la base cifrada y aplica las migraciones pendientes. */
export function openDatabase(): Promise<SqlDatabase> {
  if (!instance) {
    instance = (async () => {
      const key = await getOrCreateKey();
      const raw = await SQLite.openDatabaseAsync(DB_NAME);
      // La clave en formato hexadecimal evita derivación de clave y escapes de texto.
      await raw.execAsync(`PRAGMA key = "x'${key}'";`);
      await raw.execAsync('PRAGMA journal_mode = WAL;');
      const db = wrapExpoDatabase(raw);
      await migrate(db);
      return db;
    })().catch((error) => {
      instance = null;
      throw error;
    });
  }
  return instance;
}

/** Cierra la base y borra el archivo y su clave (eliminación de todos los datos locales). */
export async function destroyLocalDatabase(): Promise<void> {
  if (instance) {
    const db = await instance.catch(() => null);
    await db?.close();
    instance = null;
  }
  await SQLite.deleteDatabaseAsync(DB_NAME).catch(() => undefined);
  await SecureStore.deleteItemAsync(KEY_ITEM);
}
