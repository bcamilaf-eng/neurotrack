/**
 * Contenedor de servicios de la app. La app real los configura al arrancar
 * (`src/app/_layout.tsx`) y las pruebas los sustituyen por dobles.
 */
import type { SqlDatabase } from '../data/db/types';
import { createRepositories, type Repositories } from '../data/repositories';
import type { AuthService } from '../services/auth/types';
import { createLocalCommunityService } from '../services/community/localCommunity';
import type { CommunityService } from '../services/community/types';
import type { BiometricService } from '../services/security/biometrics';
import type { RemoteStore } from '../services/sync/engine';

export interface AppServices {
  auth: AuthService;
  openDatabase: () => Promise<SqlDatabase>;
  destroyLocalData: () => Promise<void>;
  biometrics: BiometricService;
  /** Comunidad sobre la base local o la nube. Por defecto, la local (pruebas y modo local). */
  community?: (db: SqlDatabase) => CommunityService;
  /** Copia en la nube; `null` o ausente en modo local y en las pruebas. */
  remote?: RemoteStore | null;
}

let services: AppServices | null = null;
let repositories: Promise<Repositories> | null = null;
let community: Promise<CommunityService> | null = null;

export function configureServices(next: AppServices): void {
  services = next;
  repositories = null;
  community = null;
}

export function getServices(): AppServices {
  if (!services) throw new Error('Servicios no configurados: llama a configureServices() al arrancar.');
  return services;
}

/** Repositorios sobre la base local, abierta una sola vez. */
export function getRepositories(): Promise<Repositories> {
  if (!repositories) {
    repositories = getServices()
      .openDatabase()
      .then(createRepositories)
      .catch((error) => {
        repositories = null;
        throw error;
      });
  }
  return repositories;
}

/** Comunidad (foros), creada una sola vez sobre la misma base local. */
export function getCommunity(): Promise<CommunityService> {
  if (!community) {
    const { openDatabase, community: create = createLocalCommunityService } = getServices();
    community = openDatabase()
      .then(create)
      .catch((error) => {
        community = null;
        throw error;
      });
  }
  return community;
}
