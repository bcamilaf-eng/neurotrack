/**
 * Autenticación local de prueba (sin servidor).
 *
 * Se activa automáticamente cuando no hay configuración de Supabase, para poder
 * probar la app completa en un teléfono sin backend. Las cuentas solo existen en
 * este dispositivo y la recuperación por email no está disponible. No usar en producción.
 *
 * La contraseña nunca se guarda: se guarda sal + hash SHA-256 iterado.
 */
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { clock } from '../../utils/clock';
import { newId } from '../../utils/id';
import { AuthError, type AuthService, type AuthSession } from './types';

const ACCOUNTS_KEY = 'neurotrack.local.accounts';
const SESSION_KEY = 'neurotrack.local.session';
const ATTEMPTS_KEY = 'neurotrack.local.attempts';
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export const HASH_ROUNDS = 2000;
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MS = 5 * 60 * 1000;
/** Duración de la sesión local antes de pedir de nuevo la contraseña. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface LocalAccount {
  id: string;
  email: string;
  salt: string;
  hash: string;
}

interface Attempts {
  failures: number;
  lockedUntil?: number;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await SecureStore.getItemAsync(key, options);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const writeJson = (key: string, value: unknown) => SecureStore.setItemAsync(key, JSON.stringify(value), options);

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password: string, salt: string, rounds = HASH_ROUNDS): Promise<string> {
  let digest = `${salt}:${password}`;
  for (let i = 0; i < rounds; i += 1) {
    digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${digest}`);
  }
  return digest;
}

/** Comparación en tiempo constante para no filtrar información por tiempos de respuesta. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function createLocalAuthService(): AuthService {
  const listeners = new Set<(session: AuthSession | null) => void>();
  const emit = (session: AuthSession | null) => listeners.forEach((l) => l(session));

  async function startSession(account: LocalAccount): Promise<AuthSession> {
    const session = { user: { id: account.id, email: account.email } };
    await writeJson(SESSION_KEY, { ...session, expiresAt: clock.now().getTime() + SESSION_TTL_MS });
    emit(session);
    return session;
  }

  async function checkLockout(email: string): Promise<Record<string, Attempts>> {
    const all = await readJson<Record<string, Attempts>>(ATTEMPTS_KEY, {});
    const entry = all[email];
    if (entry?.lockedUntil && entry.lockedUntil > clock.now().getTime()) throw new AuthError('locked_out');
    return all;
  }

  return {
    mode: 'local',

    async getSession() {
      const stored = await readJson<(AuthSession & { expiresAt: number }) | null>(SESSION_KEY, null);
      if (!stored) return null;
      if (stored.expiresAt <= clock.now().getTime()) {
        await SecureStore.deleteItemAsync(SESSION_KEY, options);
        return null;
      }
      return { user: stored.user };
    },

    async signUp(email, password) {
      const accounts = await readJson<LocalAccount[]>(ACCOUNTS_KEY, []);
      if (accounts.some((a) => a.email === email)) throw new AuthError('email_taken');
      const salt = toHex(Crypto.getRandomBytes(16));
      const account: LocalAccount = { id: newId(), email, salt, hash: await hashPassword(password, salt) };
      await writeJson(ACCOUNTS_KEY, [...accounts, account]);
      return { session: await startSession(account), needsEmailConfirmation: false };
    },

    async signIn(email, password) {
      const attempts = await checkLockout(email);
      const accounts = await readJson<LocalAccount[]>(ACCOUNTS_KEY, []);
      const account = accounts.find((a) => a.email === email);
      // Se calcula el hash aunque la cuenta no exista, para no revelar qué emails existen.
      const hash = await hashPassword(password, account?.salt ?? 'no-account');
      if (!account || !safeEqual(hash, account.hash)) {
        const failures = (attempts[email]?.failures ?? 0) + 1;
        attempts[email] =
          failures >= MAX_FAILED_ATTEMPTS
            ? { failures: 0, lockedUntil: clock.now().getTime() + LOCKOUT_MS }
            : { failures };
        await writeJson(ATTEMPTS_KEY, attempts);
        throw new AuthError(failures >= MAX_FAILED_ATTEMPTS ? 'locked_out' : 'invalid_credentials');
      }
      delete attempts[email];
      await writeJson(ATTEMPTS_KEY, attempts);
      return startSession(account);
    },

    async signOut() {
      await SecureStore.deleteItemAsync(SESSION_KEY, options);
      emit(null);
    },

    async requestPasswordReset() {
      throw new AuthError('not_supported');
    },

    async completePasswordRecovery() {
      throw new AuthError('not_supported');
    },

    async updatePassword(newPassword) {
      const session = await this.getSession();
      if (!session) throw new AuthError('invalid_credentials');
      const accounts = await readJson<LocalAccount[]>(ACCOUNTS_KEY, []);
      const salt = toHex(Crypto.getRandomBytes(16));
      const hash = await hashPassword(newPassword, salt);
      await writeJson(
        ACCOUNTS_KEY,
        accounts.map((a) => (a.id === session.user.id ? { ...a, salt, hash } : a)),
      );
    },

    async deleteAccount() {
      const session = await this.getSession();
      if (!session) return;
      const accounts = await readJson<LocalAccount[]>(ACCOUNTS_KEY, []);
      await writeJson(
        ACCOUNTS_KEY,
        accounts.filter((a) => a.id !== session.user.id),
      );
      await this.signOut();
    },

    onSessionChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
