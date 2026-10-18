/**
 * Elige el servicio de autenticación según la configuración del entorno.
 * Con `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` se usa la nube;
 * sin ellas, el modo local de prueba.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createLocalAuthService } from './localAuth';
import { createSupabaseAuthService, createSupabaseClient, type SupabaseConfig } from './supabaseAuth';
import type { AuthService } from './types';

export * from './types';

function supabaseConfig(): SupabaseConfig | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey, passwordResetRedirect: Linking.createURL('/reset-password') };
}

let client: SupabaseClient | null | undefined;

/** Cliente único de Supabase: autenticación y comunidad comparten la sesión. `null` en modo local. */
export function getSupabaseClient(): SupabaseClient | null {
  if (client === undefined) {
    const config = supabaseConfig();
    client = config ? createSupabaseClient(config) : null;
  }
  return client;
}

export function createAuthService(): AuthService {
  const config = supabaseConfig();
  const cloud = getSupabaseClient();
  if (config && cloud) return createSupabaseAuthService(config, cloud);
  return createLocalAuthService();
}
