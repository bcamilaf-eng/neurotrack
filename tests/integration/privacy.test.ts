import { CURRENT_CONSENT_VERSION } from '../../src/domain/catalogs';
import { createRepositories, type Repositories } from '../../src/data/repositories';
import { LATEST_SCHEMA_VERSION } from '../../src/data/db/migrations';
import { resetClock, setClock } from '../../src/utils/clock';
import { episodeInput, NOW, OTHER_USER_ID, USER_ID } from '../fixtures/factories';
import { createTestDatabase } from '../fixtures/testDatabase';

let db: Awaited<ReturnType<typeof createTestDatabase>>;
let repos: Repositories;

beforeEach(async () => {
  setClock(() => NOW);
  db = await createTestDatabase();
  repos = createRepositories(db);
  await repos.account.ensureUser(USER_ID, 'ana@ejemplo.com');
  await repos.account.ensureUser(OTHER_USER_ID, 'otra@ejemplo.com');
  await repos.account.recordConsents(USER_ID, [{ type: 'terms', accepted: true, version: CURRENT_CONSENT_VERSION }, { type: 'health_data', accepted: true, version: CURRENT_CONSENT_VERSION }]);
});

afterEach(async () => {
  resetClock();
  await db.close();
});

describe('exportación completa de datos', () => {
  it('incluye todo lo del usuario, sin borrados ni datos de otros', async () => {
    const kept = await repos.episodes.create(USER_ID, episodeInput({ symptoms: [{ type: 'seizure' }] }));
    const removed = await repos.episodes.create(USER_ID, episodeInput({ startedAt: '2026-10-01T10:00:00.000Z', endedAt: '2026-10-01T11:00:00.000Z' }));
    await repos.episodes.remove(USER_ID, removed.id);
    await repos.episodes.create(OTHER_USER_ID, episodeInput());
    await repos.medications.create(USER_ID, { name: 'Ibuprofeno', doseValue: 400, doseUnit: 'mg', takenAt: '2026-10-05T18:00:00.000Z', episodeId: kept.id });
    await repos.account.updateProfile(USER_ID, { name: 'Ana' });

    const data = await repos.account.exportAllData(USER_ID);
    expect(data).toMatchObject({ format: 'neurotrack-export', schemaVersion: LATEST_SCHEMA_VERSION, exportedAt: NOW.toISOString() });
    expect(data.profile).toMatchObject({ id: USER_ID, email: 'ana@ejemplo.com', name: 'Ana' });
    expect(data.tables.headache_episodes.map((e) => e.id)).toEqual([kept.id]);
    expect(data.tables.medications).toHaveLength(1);
    expect(data.tables.alarm_flags.map((f) => f.signal)).toEqual(['seizure']);
    expect(data.tables.consents).toHaveLength(2);
    expect(JSON.stringify(data)).not.toContain(OTHER_USER_ID);
  });
});

describe('borrado de registros', () => {
  it('borra los registros pero conserva cuenta, ajustes y consentimientos', async () => {
    await repos.episodes.create(USER_ID, episodeInput());
    await repos.episodes.create(OTHER_USER_ID, episodeInput());
    await repos.account.updateSettings(USER_ID, { theme: 'dark' });
    await repos.account.deleteAllData(USER_ID, { keepAccount: true });

    const data = await repos.account.exportAllData(USER_ID);
    expect(data.tables.headache_episodes).toEqual([]);
    expect(data.tables.consents).toHaveLength(2);
    expect(data.settings.theme).toBe('dark');
    expect(await repos.account.hasRequiredConsents(USER_ID)).toBe(true);
    expect(await repos.episodes.listBetween(OTHER_USER_ID, '2026-01-01', '2026-12-31')).toHaveLength(1);
  });
});
