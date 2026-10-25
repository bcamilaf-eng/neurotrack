/** `RemoteStore` sobre Supabase. Las políticas RLS garantizan que cada persona solo toca lo suyo. */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RemoteStore } from './engine';

const PAGE = 500;

export function createSupabaseRemote(client: SupabaseClient): RemoteStore {
  return {
    async upsert(table, key, rows) {
      const { error } = await client.from(table).upsert(rows, { onConflict: key });
      if (!error) return [];
      // Si el lote falla, se reintenta fila a fila para no bloquear todo por una sola.
      const failed: string[] = [];
      for (const row of rows) {
        const single = await client.from(table).upsert(row, { onConflict: key });
        if (single.error) failed.push(String(row[key]));
      }
      return failed;
    },

    async changedSince(table, ownerColumn, userId, since) {
      const rows: Record<string, unknown>[] = [];
      for (let from = 0; ; from += PAGE) {
        let query = client.from(table).select('*').eq(ownerColumn, userId).order('updated_at').range(from, from + PAGE - 1);
        if (since) query = query.gt('updated_at', since);
        const { data, error } = await query;
        if (error) throw new Error(`No se pudo leer ${table}: ${error.message}`);
        rows.push(...(data as Record<string, unknown>[]));
        if (!data || data.length < PAGE) return rows;
      }
    },

    async deleteAll(table, ownerColumn, userId) {
      const { error } = await client.from(table).delete().eq(ownerColumn, userId);
      if (error) throw new Error(`No se pudo borrar ${table}: ${error.message}`);
    },
  };
}
