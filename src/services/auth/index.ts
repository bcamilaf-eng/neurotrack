/**
 * Elige el servicio de autenticación según la configuración del entorno.
 * Con `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` se usa la nube;
 * sin ellas, el modo local de prueba.
 */
import * as Linking from 'expo-linking';
import { createLocalAuthService } from './localAuth';
import { createSupabaseAuthService } from './supabaseAuth';
import type { AuthService } from './types';

export * from './types';

export function createAuthService(): AuthService {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anonKey) {
    return createSupabaseAuthService({
      url,
      anonKey,
      passwordResetRedirect: Linking.createURL('/reset-password'),
    });
  }
  return createLocalAuthService();
}
