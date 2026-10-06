/**
 * Contrato mínimo de base de datos SQL que usan los repositorios.
 *
 * En la app lo implementa expo-sqlite (con SQLCipher); en las pruebas, better-sqlite3.
 * Así los repositorios se prueban contra SQLite real sin un dispositivo.
 */
export type SqlValue = string | number | null;
export type SqlParams = SqlValue[];

export interface RunResult {
  changes: number;
}

export interface SqlDatabase {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlParams): Promise<RunResult>;
  all<T>(sql: string, params?: SqlParams): Promise<T[]>;
  first<T>(sql: string, params?: SqlParams): Promise<T | null>;
  /** Ejecuta `task` en una transacción: todo o nada. */
  transaction<T>(task: () => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
