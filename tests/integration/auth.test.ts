import * as SecureStore from 'expo-secure-store';
import { createLocalAuthService, LOCKOUT_MS, MAX_FAILED_ATTEMPTS } from '../../src/services/auth/localAuth';
import { toAuthError } from '../../src/services/auth/errors';
import { parseRecoveryLink } from '../../src/services/auth/supabaseAuth';
import { secureSessionStorage } from '../../src/services/auth/secureSessionStorage';
import { AuthError } from '../../src/services/auth/types';
import { configureServices } from '../../src/state/services';
import { useSession } from '../../src/state/sessionStore';
import { ValidationError } from '../../src/domain/errors';
import { resetClock, setClock } from '../../src/utils/clock';
import { NOW } from '../fixtures/factories';
import { createTestDatabase } from '../fixtures/testDatabase';


const resetSecureStore = () => (SecureStore as unknown as { __reset(): void }).__reset();
const PASSWORD = 'cefalea2026';

let now = NOW.getTime();
beforeEach(() => {
  resetSecureStore();
  now = NOW.getTime();
  setClock(() => new Date(now));
});
afterEach(() => resetClock());

describe('autenticación local de prueba', () => {
  it('crea un usuario, inicia sesión y la recuerda', async () => {
    const auth = createLocalAuthService();
    const { session, needsEmailConfirmation } = await auth.signUp('ana@ejemplo.com', PASSWORD);
    expect(needsEmailConfirmation).toBe(false);
    expect(session?.user.email).toBe('ana@ejemplo.com');
    await auth.signOut();
    expect(await auth.getSession()).toBeNull();
    const again = await auth.signIn('ana@ejemplo.com', PASSWORD);
    expect(again.user.id).toBe(session?.user.id);
    expect(await auth.getSession()).toEqual(again);
  });

  it('no guarda la contraseña en claro', async () => {
    const auth = createLocalAuthService();
    await auth.signUp('ana@ejemplo.com', PASSWORD);
    const stored = await SecureStore.getItemAsync('neurotrack.local.accounts');
    expect(stored).not.toContain(PASSWORD);
  });

  it('rechaza emails duplicados y contraseñas incorrectas', async () => {
    const auth = createLocalAuthService();
    await auth.signUp('ana@ejemplo.com', PASSWORD);
    await expect(auth.signUp('ana@ejemplo.com', PASSWORD)).rejects.toMatchObject({ code: 'email_taken' });
    await expect(auth.signIn('ana@ejemplo.com', 'otraclave99')).rejects.toMatchObject({ code: 'invalid_credentials' });
    await expect(auth.signIn('nadie@ejemplo.com', PASSWORD)).rejects.toMatchObject({ code: 'invalid_credentials' });
  });

  it('bloquea temporalmente tras varios intentos fallidos', async () => {
    const auth = createLocalAuthService();
    await auth.signUp('ana@ejemplo.com', PASSWORD);
    for (let i = 1; i < MAX_FAILED_ATTEMPTS; i += 1) {
      await expect(auth.signIn('ana@ejemplo.com', 'mal')).rejects.toMatchObject({ code: 'invalid_credentials' });
    }
    await expect(auth.signIn('ana@ejemplo.com', 'mal')).rejects.toMatchObject({ code: 'locked_out' });
    await expect(auth.signIn('ana@ejemplo.com', PASSWORD)).rejects.toMatchObject({ code: 'locked_out' });
    now += LOCKOUT_MS + 1;
    await expect(auth.signIn('ana@ejemplo.com', PASSWORD)).resolves.toBeDefined();
  });

  it('caduca la sesión pasado su tiempo de vida', async () => {
    const auth = createLocalAuthService();
    await auth.signUp('ana@ejemplo.com', PASSWORD);
    now += 31 * 24 * 60 * 60 * 1000;
    expect(await auth.getSession()).toBeNull();
  });

  it('indica que la recuperación por email requiere la nube', async () => {
    await expect(createLocalAuthService().requestPasswordReset('ana@ejemplo.com')).rejects.toMatchObject({
      code: 'not_supported',
    });
  });
});

describe('errores de Supabase', () => {
  it.each([
    [{ code: 'invalid_credentials', status: 400 }, 'invalid_credentials'],
    [{ code: 'user_already_exists', status: 422 }, 'email_taken'],
    [{ code: 'email_not_confirmed', status: 400 }, 'email_not_confirmed'],
    [{ code: 'weak_password', status: 422 }, 'weak_password'],
    [{ code: 'over_request_rate_limit', status: 429 }, 'rate_limited'],
    [{ name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' }, 'network'],
    [{ message: 'algo raro' }, 'unknown'],
  ])('%p → %p', (raw, code) => {
    const error = toAuthError(raw);
    expect(error).toBeInstanceOf(AuthError);
    expect(error.code).toBe(code);
    expect(error.message).not.toMatch(/algo raro|Failed to fetch/);
  });

  it('lee los tokens del enlace de recuperación', () => {
    expect(parseRecoveryLink('neurotrack://reset-password#access_token=a&refresh_token=b&type=recovery')).toEqual({
      accessToken: 'a',
      refreshToken: 'b',
    });
    expect(parseRecoveryLink('neurotrack://reset-password')).toBeNull();
  });
});

describe('almacenamiento seguro de la sesión', () => {
  it('trocea y recompone valores largos', async () => {
    const value = 'x'.repeat(5000);
    await secureSessionStorage.setItem('sb-auth-token', value);
    expect(await secureSessionStorage.getItem('sb-auth-token')).toBe(value);
    await secureSessionStorage.setItem('sb-auth-token', 'corto');
    expect(await secureSessionStorage.getItem('sb-auth-token')).toBe('corto');
    await secureSessionStorage.removeItem('sb-auth-token');
    expect(await secureSessionStorage.getItem('sb-auth-token')).toBeNull();
  });
});

describe('estado de sesión', () => {
  const biometrics = { isAvailable: jest.fn(async () => true), authenticate: jest.fn(async () => true) };

  beforeEach(async () => {
    const db = await createTestDatabase();
    configureServices({
      auth: createLocalAuthService(),
      openDatabase: async () => db,
      destroyLocalData: async () => undefined,
      biometrics,
    });
    useSession.setState({ status: 'initializing', user: null, settings: null, backgroundedAt: null });
    await useSession.getState().initialize();
  });

  it('empieza sin sesión', () => {
    expect(useSession.getState().status).toBe('signedOut');
    expect(useSession.getState().mode).toBe('local');
  });

  it('valida el formulario de registro antes de llamar al servidor', async () => {
    await expect(
      useSession.getState().signUp({ email: 'ana', password: 'corta', confirmPassword: 'corta' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('tras registrarse pide el consentimiento y luego da acceso', async () => {
    await useSession.getState().signUp({ email: 'Ana@Ejemplo.com', password: PASSWORD, confirmPassword: PASSWORD });
    expect(useSession.getState().status).toBe('needsConsent');
    expect(useSession.getState().user?.email).toBe('ana@ejemplo.com');

    await useSession.getState().acceptConsents({ terms: true, health_data: false });
    expect(useSession.getState().status).toBe('needsConsent');

    await useSession.getState().acceptConsents({ terms: true, health_data: true, cloud_sync: false });
    expect(useSession.getState().status).toBe('ready');
  });

  it('rechaza un inicio de sesión con credenciales incorrectas sin cambiar de estado', async () => {
    await useSession.getState().signUp({ email: 'ana@ejemplo.com', password: PASSWORD, confirmPassword: PASSWORD });
    await useSession.getState().signOut();
    await expect(useSession.getState().signIn({ email: 'ana@ejemplo.com', password: 'incorrecta1' })).rejects.toMatchObject({
      code: 'invalid_credentials',
    });
    expect(useSession.getState().status).toBe('signedOut');
  });

  it('bloquea al volver de segundo plano si pasó el tiempo configurado', async () => {
    await useSession.getState().signUp({ email: 'ana@ejemplo.com', password: PASSWORD, confirmPassword: PASSWORD });
    await useSession.getState().acceptConsents({ terms: true, health_data: true });
    await useSession.getState().setBiometricLock(true);
    expect(useSession.getState().settings?.biometricLock).toBe(true);

    useSession.getState().onBackground();
    now += 60_000;
    useSession.getState().onForeground();
    expect(useSession.getState().status).toBe('ready');

    useSession.getState().onBackground();
    now += 6 * 60_000;
    useSession.getState().onForeground();
    expect(useSession.getState().status).toBe('locked');

    biometrics.authenticate.mockResolvedValueOnce(false);
    expect(await useSession.getState().unlock()).toBe(false);
    expect(useSession.getState().status).toBe('locked');
    expect(await useSession.getState().unlock()).toBe(true);
    expect(useSession.getState().status).toBe('ready');
  });

  it('pide desbloqueo al reabrir la app si el bloqueo está activo', async () => {
    await useSession.getState().signUp({ email: 'ana@ejemplo.com', password: PASSWORD, confirmPassword: PASSWORD });
    await useSession.getState().acceptConsents({ terms: true, health_data: true });
    await useSession.getState().setBiometricLock(true);
    useSession.setState({ status: 'initializing', user: null });
    await useSession.getState().initialize();
    expect(useSession.getState().status).toBe('locked');
  });

  it('elimina la cuenta y todos sus datos locales', async () => {
    await useSession.getState().signUp({ email: 'ana@ejemplo.com', password: PASSWORD, confirmPassword: PASSWORD });
    await useSession.getState().deleteAccount();
    expect(useSession.getState().status).toBe('signedOut');
    await expect(useSession.getState().signIn({ email: 'ana@ejemplo.com', password: PASSWORD })).rejects.toMatchObject({
      code: 'invalid_credentials',
    });
  });
});
