/**
 * Contrato de autenticación.
 *
 * Hay dos implementaciones:
 * - `cloud`: Supabase Auth (registro, login, verificación de email, recuperación por enlace).
 * - `local`: modo de prueba sin servidor, solo para desarrollo y demostraciones.
 */
export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthSession {
  user: AuthUser;
}

export interface SignUpResult {
  session: AuthSession | null;
  /** El servidor envió un email de verificación y no hay sesión hasta confirmarlo. */
  needsEmailConfirmation: boolean;
}

export type AuthMode = 'cloud' | 'local';

export interface AuthService {
  readonly mode: AuthMode;
  getSession(): Promise<AuthSession | null>;
  signUp(email: string, password: string): Promise<SignUpResult>;
  signIn(email: string, password: string): Promise<AuthSession>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  /** Abre la sesión de recuperación a partir del enlace recibido por email. */
  completePasswordRecovery(url: string): Promise<AuthSession>;
  updatePassword(newPassword: string): Promise<void>;
  deleteAccount(): Promise<void>;
  /** Avisa de cierres de sesión externos (token revocado, otra pestaña…). Devuelve la baja. */
  onSessionChange(listener: (session: AuthSession | null) => void): () => void;
}

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_taken'
  | 'email_not_confirmed'
  | 'weak_password'
  | 'rate_limited'
  | 'locked_out'
  | 'network'
  | 'invalid_link'
  | 'not_supported'
  | 'unknown';

const MESSAGES: Record<AuthErrorCode, string> = {
  invalid_credentials: 'Email o contraseña incorrectos.',
  email_taken: 'Ya existe una cuenta con ese email. Inicia sesión o recupera tu contraseña.',
  email_not_confirmed: 'Confirma tu email con el enlace que te enviamos antes de iniciar sesión.',
  weak_password: 'La contraseña es demasiado débil o aparece en filtraciones conocidas. Elige otra.',
  rate_limited: 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.',
  locked_out: 'Demasiados intentos fallidos. Espera 5 minutos y vuelve a intentarlo.',
  network: 'No hay conexión con el servidor. Comprueba tu conexión e inténtalo de nuevo.',
  invalid_link: 'El enlace no es válido o ha caducado. Solicita uno nuevo.',
  not_supported: 'Esta función necesita la cuenta en la nube y no está disponible en el modo local de prueba.',
  unknown: 'Algo salió mal. Inténtalo de nuevo.',
};

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  constructor(code: AuthErrorCode, message = MESSAGES[code]) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}
