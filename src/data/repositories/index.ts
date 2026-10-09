import type { SqlDatabase } from '../db/types';
import { AccountRepository } from './accountRepository';
import { AlarmRepository } from './alarmRepository';
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
  const account = new AccountRepository(db);
  const episodes = new EpisodeRepository(db);
  const alarms = new AlarmRepository(db, episodes, account);
  // Cada cambio de un episodio vuelve a evaluar sus señales de alarma (§16).
  episodes.onChange = (userId, episodeId) => alarms.evaluate(userId, episodeId);
  return {
    account,
    episodes,
    alarms,
    medications: createMedicationRepository(db),
    sleep: createSleepRepository(db),
    hydration: createHydrationRepository(db),
    meals: createMealRepository(db),
    daily: createDailyRecordRepository(db),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
