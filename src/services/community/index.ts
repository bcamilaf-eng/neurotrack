/**
 * Elige la Comunidad según la configuración: compartida en Supabase si hay nube,
 * o en este teléfono en el modo local de prueba.
 */
import type { SqlDatabase } from '../../data/db/types';
import { getSupabaseClient } from '../auth';
import { createLocalCommunityService } from './localCommunity';
import { createSupabaseCommunityService } from './supabaseCommunity';
import type { CommunityService } from './types';

export * from './types';

export function createCommunityService(db: SqlDatabase): CommunityService {
  const client = getSupabaseClient();
  return client ? createSupabaseCommunityService(client) : createLocalCommunityService(db);
}
