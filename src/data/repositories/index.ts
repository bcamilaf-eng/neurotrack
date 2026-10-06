import type { SqlDatabase } from '../db/types';
import { AccountRepository } from './accountRepository';
import { EpisodeRepository } from './episodeRepository';
import {
  createDailyRecordRepository,
  createHydrationRepository,
  createMealRepository,
  createMedicationRepository,
  createSleepRepository,
} from './habitRepositories';

/** Punto único de acceso a todos los repositorios sobre una misma base de datos. */
export function createRepositories(db: SqlDatabase) {
  return {
    account: new AccountRepository(db),
    episodes: new EpisodeRepository(db),
    medications: createMedicationRepository(db),
    sleep: createSleepRepository(db),
    hydration: createHydrationRepository(db),
    meals: createMealRepository(db),
    daily: createDailyRecordRepository(db),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
