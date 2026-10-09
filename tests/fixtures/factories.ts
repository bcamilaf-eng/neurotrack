/** Datos de ejemplo coherentes para las pruebas. */
import type { EpisodeInput } from '../../src/domain/entities/episode';

export const USER_ID = 'user-1';
export const OTHER_USER_ID = 'user-2';

/** Reloj fijo de las pruebas: 6 de octubre de 2026, 12:00 UTC. */
export const NOW = new Date('2026-10-06T12:00:00.000Z');

export function episodeInput(overrides: Partial<EpisodeInput> = {}): EpisodeInput {
  return {
    startedAt: '2026-10-05T17:00:00.000Z',
    endedAt: '2026-10-05T21:00:00.000Z',
    ongoing: false,
    type: 'migraine',
    intensity: 8,
    locations: ['unilateral_left', 'temporal'],
    qualities: ['pulsating'],
    symptoms: [{ type: 'nausea' }, { type: 'photophobia' }],
    triggers: [{ type: 'sleep_deprivation' }],
    notes: 'Empezó en el trabajo.',
    ...overrides,
  };
}
