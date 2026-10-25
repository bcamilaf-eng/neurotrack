/**
 * Estado de la sincronización con la nube. Solo actúa en modo nube y si la persona aceptó
 * guardar una copia («Sincronizar una copia cifrada en la nube»). Nunca bloquea el uso de la app:
 * si falla (sin conexión, por ejemplo), se reintenta en la siguiente ocasión.
 */
import { create } from 'zustand';
import { deleteRemoteRecords, isSyncEnabled, syncNow } from '../services/sync/engine';
import { getServices } from './services';
import { useSession } from './sessionStore';

interface SyncState {
  running: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  /** Sincroniza si corresponde. Devuelve `false` si no está activada o no hay nube. */
  run(): Promise<boolean>;
  /** Al borrar los registros conservando la cuenta, también se borran de la nube. */
  deleteRemoteRecords(): Promise<void>;
}

async function context() {
  const services = getServices();
  const user = useSession.getState().user;
  if (!services.remote || !user) return null;
  const db = await services.openDatabase();
  if (!(await isSyncEnabled(db, user.id))) return null;
  return { db, remote: services.remote, userId: user.id };
}

export const useSync = create<SyncState>((set, get) => ({
  running: false,
  lastSyncAt: null,
  lastError: null,

  async run() {
    if (get().running) return false;
    const ctx = await context().catch(() => null);
    if (!ctx) return false;
    set({ running: true, lastError: null });
    try {
      const result = await syncNow(ctx.db, ctx.remote, ctx.userId);
      set({ lastSyncAt: result.at });
      // Los ajustes pueden haber llegado de otro teléfono.
      if (result.pulled > 0) await useSession.getState().reloadSettings();
      return true;
    } catch {
      set({ lastError: 'No se pudo sincronizar. Se reintentará cuando haya conexión.' });
      return false;
    } finally {
      set({ running: false });
    }
  },

  async deleteRemoteRecords() {
    const ctx = await context();
    if (ctx) await deleteRemoteRecords(ctx.remote, ctx.userId);
  },
}));
