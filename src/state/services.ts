/**
 * Contenedor de servicios de la app. La app real los configura al arrancar
 * (`src/app/_layout.tsx`) y las pruebas los sustituyen por dobles.
 */
import type { SqlDatabase } from '../data/db/types';
import { createRepositories, type Repositories } from '../data/repositories';
import type { AuthService } from '../services/auth/types';
import type { BiometricService } from '../services/security/biometrics';

export interface AppServices {
  auth: AuthService;
  openDatabase: () => Promise<SqlDatabase>;
  destroyLocalData: () => Promise<void>;
  biometrics: BiometricService;
}

let services: AppServices | null = null;
let repositories: Promise<Repositories> | null = null;

export function configureServices(next: AppServices): void {
  services = next;
  repositories = null;
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
