/**
 * Estado de sesión de la app.
 *
 * Estados posibles:
 * - `initializing`: abriendo la base cifrada y recuperando la sesión.
 * - `signedOut`: sin sesión; solo se ve el acceso.
 * - `needsConsent`: sesión iniciada pero faltan los consentimientos obligatorios vigentes.
 * - `locked`: sesión válida, pero la app pide biometría antes de mostrar datos.
 * - `ready`: todo listo.
 */
import { create } from 'zustand';
import { CURRENT_CONSENT_VERSION, type ConsentType } from '../domain/catalogs';
import { signInSchema, signUpSchema } from '../domain/entities/user';
import { parseOrThrow } from '../domain/errors';
import type { UserSettings } from '../data/repositories/accountRepository';
import { AuthError, type AuthMode, type AuthSession, type AuthUser } from '../services/auth/types';
import type { ReminderSettings } from '../domain/reminders';
import { applyReminders, cancelReminders } from '../services/notifications/reminders';
import { clock } from '../utils/clock';
import { getRepositories, getServices } from './services';

export type SessionStatus = 'initializing' | 'signedOut' | 'needsConsent' | 'locked' | 'ready';

export interface SessionState {
  status: SessionStatus;
  user: AuthUser | null;
  mode: AuthMode | null;
  settings: UserSettings | null;
  /** Error que impidió arrancar (p. ej. no se pudo abrir la base). */
  fatalError: string | null;
  backgroundedAt: number | null;

  initialize(): Promise<void>;
  signUp(input: { email: string; password: string; confirmPassword: string }): Promise<{ needsEmailConfirmation: boolean }>;
  signIn(input: { email: string; password: string }): Promise<void>;
  signOut(): Promise<void>;
  acceptConsents(decisions: Partial<Record<ConsentType, boolean>>): Promise<void>;
  unlock(): Promise<boolean>;
  setBiometricLock(enabled: boolean): Promise<void>;
  /** Guarda los recordatorios y los reprograma. Devuelve cuántos quedaron activos. */
  saveReminders(reminders: ReminderSettings): Promise<number>;
  onBackground(): void;
  onForeground(): void;
  deleteAccount(): Promise<void>;
}

let unsubscribe: (() => void) | null = null;

export const useSession = create<SessionState>((set, get) => {
  /** Lleva una sesión recién obtenida al estado que corresponda. */
  async function enter(session: AuthSession, { fromColdStart }: { fromColdStart: boolean }) {
    const repos = await getRepositories();
    await repos.account.ensureUser(session.user.id, session.user.email);
    const [settings, consented] = await Promise.all([
      repos.account.getSettings(session.user.id),
      repos.account.hasRequiredConsents(session.user.id),
    ]);
    let status: SessionStatus = 'ready';
    if (!consented) status = 'needsConsent';
    else if (fromColdStart && settings.biometricLock) status = 'locked';
    set({ user: session.user, settings, status });
  }

  return {
    status: 'initializing',
    user: null,
    mode: null,
    settings: null,
    fatalError: null,
    backgroundedAt: null,

    async initialize() {
      try {
        const { auth } = getServices();
        set({ mode: auth.mode, fatalError: null });
        await getRepositories();
        unsubscribe?.();
        unsubscribe = auth.onSessionChange((session) => {
          // Cierre de sesión externo (token revocado, cuenta eliminada…).
          if (!session && get().user) set({ status: 'signedOut', user: null, settings: null });
        });
        const session = await auth.getSession().catch(() => null);
        if (session) await enter(session, { fromColdStart: true });
        else set({ status: 'signedOut' });
      } catch (error) {
        set({
          status: 'signedOut',
          fatalError: 'No se pudo abrir tu registro protegido en este dispositivo. Reinicia la app.',
        });
        throw error;
      }
    },

    async signUp(input) {
      const data = parseOrThrow(signUpSchema, input);
      const result = await getServices().auth.signUp(data.email, data.password);
      if (result.session) await enter(result.session, { fromColdStart: false });
      return { needsEmailConfirmation: result.needsEmailConfirmation };
    },

    async signIn(input) {
      const data = parseOrThrow(signInSchema, input);
      const session = await getServices().auth.signIn(data.email, data.password);
      await enter(session, { fromColdStart: false });
    },

    async signOut() {
      await getServices().auth.signOut();
      // Los recordatorios son de esta cuenta: no deben seguir sonando sin sesión.
      await cancelReminders().catch(() => undefined);
      set({ status: 'signedOut', user: null, settings: null });
    },

    async acceptConsents(decisions) {
      const user = get().user;
      if (!user) throw new AuthError('invalid_credentials');
      const repos = await getRepositories();
      await repos.account.recordConsents(
        user.id,
        (Object.entries(decisions) as [ConsentType, boolean][]).map(([type, accepted]) => ({
          type,
          accepted,
          version: CURRENT_CONSENT_VERSION,
        })),
      );
      const consented = await repos.account.hasRequiredConsents(user.id);
      set({ status: consented ? 'ready' : 'needsConsent' });
    },

    async unlock() {
      const ok = await getServices().biometrics.authenticate('Desbloquea NeuroTrack');
      if (ok) set({ status: 'ready', backgroundedAt: null });
      return ok;
    },

    async setBiometricLock(enabled) {
      const user = get().user;
      if (!user) return;
      if (enabled) {
        const { biometrics } = getServices();
        if (!(await biometrics.isAvailable())) {
          throw new Error('Configura Face ID, huella o un código en el dispositivo para activar el bloqueo.');
        }
        if (!(await biometrics.authenticate('Confirma para activar el bloqueo'))) return;
      }
      const repos = await getRepositories();
      const settings = await repos.account.updateSettings(user.id, { biometricLock: enabled });
      set({ settings });
    },

    async saveReminders(reminders) {
      const user = get().user;
      if (!user) return 0;
      const repos = await getRepositories();
      const settings = await repos.account.updateSettings(user.id, { reminders });
      set({ settings });
      return applyReminders(reminders);
    },

    onBackground() {
      if (get().status === 'ready') set({ backgroundedAt: clock.now().getTime() });
    },

    onForeground() {
      const { status, settings, backgroundedAt } = get();
      if (status !== 'ready' || !settings?.biometricLock || backgroundedAt === null) return;
      const elapsed = clock.now().getTime() - backgroundedAt;
      if (elapsed >= settings.lockAfterMinutes * 60_000) set({ status: 'locked' });
      else set({ backgroundedAt: null });
    },

    async deleteAccount() {
      const user = get().user;
      if (!user) return;
      const services = getServices();
      await services.auth.deleteAccount();
      const repos = await getRepositories();
      await repos.account.deleteAllData(user.id, { keepAccount: false });
      await cancelReminders().catch(() => undefined);
      set({ status: 'signedOut', user: null, settings: null });
    },
  };
});
