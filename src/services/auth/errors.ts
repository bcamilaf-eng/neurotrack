import { AuthError, type AuthErrorCode } from './types';

const SUPABASE_CODES: Record<string, AuthErrorCode> = {
  invalid_credentials: 'invalid_credentials',
  user_not_found: 'invalid_credentials',
  email_exists: 'email_taken',
  user_already_exists: 'email_taken',
  email_not_confirmed: 'email_not_confirmed',
  weak_password: 'weak_password',
  over_request_rate_limit: 'rate_limited',
  over_email_send_rate_limit: 'rate_limited',
  otp_expired: 'invalid_link',
  flow_state_expired: 'invalid_link',
  bad_jwt: 'invalid_link',
  session_expired: 'invalid_link',
  request_timeout: 'network',
};

/**
 * Traduce cualquier error de Supabase (o de red) a un `AuthError` con mensaje en español.
 * Nunca deja pasar el texto original del servidor al usuario.
 */
export function toAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;
  const e = error as { code?: string; status?: number; name?: string; message?: string } | null;
  if (e?.code && SUPABASE_CODES[e.code]) return new AuthError(SUPABASE_CODES[e.code]);
  if (e?.name === 'AuthRetryableFetchError' || e?.status === 0 || /network|fetch/i.test(e?.message ?? '')) {
    return new AuthError('network');
  }
  if (e?.status === 429) return new AuthError('rate_limited');
  if (e?.status === 400 && /invalid login/i.test(e?.message ?? '')) return new AuthError('invalid_credentials');
  return new AuthError('unknown');
}
