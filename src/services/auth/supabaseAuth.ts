/**
 * Autenticación en la nube con Supabase Auth.
 *
 * - La sesión se guarda cifrada en Keychain/Keystore (nunca en AsyncStorage).
 * - El token de acceso dura 1 h y se renueva solo mientras la app está en primer plano.
 * - Los datos clínicos no pasan por aquí: solo email, contraseña y tokens.
 */
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { toAuthError } from './errors';
import { secureSessionStorage } from './secureSessionStorage';
import { AuthError, type AuthService, type AuthSession } from './types';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  /** URL a la que vuelve el enlace de recuperación (p. ej. `neurotrack://reset-password`). */
  passwordResetRedirect: string;
}

function toSession(session: Session | null): AuthSession | null {
  if (!session?.user?.email) return null;
  return { user: { id: session.user.id, email: session.user.email } };
}

/** Extrae `access_token` y `refresh_token` del fragmento (#) o la consulta (?) del enlace. */
export function parseRecoveryLink(url: string): { accessToken: string; refreshToken: string } | null {
  const raw = url.includes('#') ? url.split('#')[1] : url.split('?')[1] ?? '';
  const params = new URLSearchParams(raw);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}

export function createSupabaseClient(config: SupabaseConfig): SupabaseClient {
  return createClient(config.url, config.anonKey, {
    auth: {
      storage: secureSessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export function createSupabaseAuthService(config: SupabaseConfig, client = createSupabaseClient(config)): AuthService {
  const auth = client.auth;

  // Renovar tokens solo en primer plano, como recomienda Supabase para apps móviles.
  AppState.addEventListener('change', (state) => {
    if (state === 'active') auth.startAutoRefresh();
    else auth.stopAutoRefresh();
  });

  return {
    mode: 'cloud',

    async getSession() {
      const { data, error } = await auth.getSession();
      if (error) throw toAuthError(error);
      return toSession(data.session);
    },

    async signUp(email, password) {
      const { data, error } = await auth.signUp({ email, password });
      if (error) throw toAuthError(error);
      const session = toSession(data.session);
      return { session, needsEmailConfirmation: !session };
    },

    async signIn(email, password) {
      const { data, error } = await auth.signInWithPassword({ email, password });
      if (error) throw toAuthError(error);
      const session = toSession(data.session);
      if (!session) throw new AuthError('unknown');
      return session;
    },

    async signOut() {
      // `local` cierra la sesión de este dispositivo aunque no haya red.
      const { error } = await auth.signOut({ scope: 'local' });
      if (error) throw toAuthError(error);
    },

    async requestPasswordReset(email) {
      const { error } = await auth.resetPasswordForEmail(email, { redirectTo: config.passwordResetRedirect });
      // Por privacidad no se revela si el email existe: solo fallan red y límites.
      if (error && toAuthError(error).code !== 'invalid_credentials') throw toAuthError(error);
    },

    async completePasswordRecovery(url) {
      const tokens = parseRecoveryLink(url);
      if (!tokens) throw new AuthError('invalid_link');
      const { data, error } = await auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });
      if (error) throw toAuthError(error);
      const session = toSession(data.session);
      if (!session) throw new AuthError('invalid_link');
      return session;
    },

    async updatePassword(newPassword) {
      const { error } = await auth.updateUser({ password: newPassword });
      if (error) throw toAuthError(error);
    },

    async deleteAccount() {
      // La función de servidor borra todas las filas del usuario y su cuenta de Auth.
      const { error } = await client.functions.invoke('delete-account', { method: 'POST' });
      if (error) throw toAuthError(error);
      await auth.signOut({ scope: 'local' });
    },

    onSessionChange(listener) {
      const { data } = auth.onAuthStateChange((_event, session) => listener(toSession(session)));
      return () => data.subscription.unsubscribe();
    },
  };
}
