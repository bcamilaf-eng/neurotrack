import { createRepositories, type Repositories } from '../../src/data/repositories';
import { CURRENT_CONSENT_VERSION } from '../../src/domain/catalogs';
import { deleteRemoteRecords, isSyncEnabled, type RemoteStore, syncNow } from '../../src/services/sync/engine';
import { resetClock, setClock } from '../../src/utils/clock';
import { episodeInput, NOW, USER_ID } from '../fixtures/factories';
import { createTestDatabase } from '../fixtures/testDatabase';

/** Nube en memoria: guarda las filas tal como llegarían a Supabase. */
function memoryRemote() {
  const tables = new Map<string, Map<string, Record<string, unknown>>>();
  const tableOf = (name: string) => tables.get(name) ?? tables.set(name, new Map()).get(name)!;
  const store: RemoteStore = {
    async upsert(table, key, rows) {
      for (const row of rows) tableOf(table).set(String(row[key]), structuredClone(row));
      return [];
    },
    async changedSince(table, owner, userId, since) {
      return [...tableOf(table).values()]
        .filter((r) => r[owner] === userId && (!since || String(r.updated_at) > since))
        .map((r) => structuredClone(r));
    },
    async deleteAll(table, owner, userId) {
      for (const [k, r] of tableOf(table)) if (r[owner] === userId) tableOf(table).delete(k);
    },
  };
  return { store, tables, count: (t: string) => tableOf(t).size };
}

type Phone = { db: Awaited<ReturnType<typeof createTestDatabase>>; repos: Repositories };

async function phone(syncConsent = true): Promise<Phone> {
  const db = await createTestDatabase();
  const repos = createRepositories(db);
  await repos.account.ensureUser(USER_ID, 'ana@ejemplo.com');
  await repos.account.recordConsents(USER_ID, [
    { type: 'terms', accepted: true, version: CURRENT_CONSENT_VERSION },
    { type: 'health_data', accepted: true, version: CURRENT_CONSENT_VERSION },
    { type: 'cloud_sync', accepted: syncConsent, version: CURRENT_CONSENT_VERSION },
  ]);
  return { db, repos };
}

let now = NOW.getTime();
const tick = (minutes: number) => {
  now += minutes * 60_000;
};

beforeEach(() => {
  now = NOW.getTime();
  setClock(() => new Date(now));
});
afterEach(() => resetClock());

describe('sincronización con la nube', () => {
  it('solo se activa con el consentimiento de copia en la nube', async () => {
    expect(await isSyncEnabled((await phone(true)).db, USER_ID)).toBe(true);
    expect(await isSyncEnabled((await phone(false)).db, USER_ID)).toBe(false);
  });

  it('lo registrado en un teléfono aparece en otro, con perfil, episodios, síntomas y hábitos', async () => {
    const remote = memoryRemote();
    const a = await phone();
    await a.repos.account.updateProfile(USER_ID, { name: 'Ana', diagnoses: ['migraine_with_aura'] });
    const episode = await a.repos.episodes.create(USER_ID, episodeInput());
    await a.repos.sleep.create(USER_ID, { date: '2026-10-05', bedtimeAt: '2026-10-04T23:00:00.000Z', wakeAt: '2026-10-05T07:00:00.000Z', quality: 4 });

    const first = await syncNow(a.db, remote.store, USER_ID);
    expect(first.pushed).toBeGreaterThan(0);
    expect(remote.count('headache_episodes')).toBe(1);
    expect(await a.db.first("SELECT COUNT(*) AS n FROM headache_episodes WHERE sync_status = 'pending'")).toEqual({ n: 0 });

    tick(5);
    const b = await phone();
    await syncNow(b.db, remote.store, USER_ID);
    expect(await b.repos.account.getProfile(USER_ID)).toMatchObject({ name: 'Ana', diagnoses: ['migraine_with_aura'] });
    const synced = await b.repos.episodes.get(USER_ID, episode.id);
    expect(synced).toMatchObject({ intensity: 8, symptoms: [{ type: 'nausea' }, { type: 'photophobia' }] });
    expect(await b.repos.sleep.getByDate(USER_ID, '2026-10-05')).toMatchObject({ quality: 4 });
  });

  it('gana el cambio más reciente y los borrados se propagan', async () => {
    const remote = memoryRemote();
    const a = await phone();
    const sleep = await a.repos.sleep.create(USER_ID, { date: '2026-10-05', bedtimeAt: '2026-10-04T23:00:00.000Z', wakeAt: '2026-10-05T07:00:00.000Z', quality: 2 });
    const episode = await a.repos.episodes.create(USER_ID, episodeInput());
    await syncNow(a.db, remote.store, USER_ID);

    tick(5);
    const b = await phone();
    await syncNow(b.db, remote.store, USER_ID);
    tick(5);
    await b.repos.sleep.update(USER_ID, sleep.id, { date: '2026-10-05', bedtimeAt: '2026-10-04T23:00:00.000Z', wakeAt: '2026-10-05T07:00:00.000Z', quality: 5 });
    await b.repos.episodes.remove(USER_ID, episode.id);
    await syncNow(b.db, remote.store, USER_ID);

    tick(5);
    await syncNow(a.db, remote.store, USER_ID);
    expect((await a.repos.sleep.getByDate(USER_ID, '2026-10-05'))?.quality).toBe(5);
    expect(await a.repos.episodes.listBetween(USER_ID, '2026-10-01', '2026-10-06')).toEqual([]);
  });

  it('un cambio local más nuevo no se pisa con lo que baja de la nube', async () => {
    const remote = memoryRemote();
    const a = await phone();
    const sleep = await a.repos.sleep.create(USER_ID, { date: '2026-10-05', bedtimeAt: '2026-10-04T23:00:00.000Z', wakeAt: '2026-10-05T07:00:00.000Z', quality: 2 });
    await syncNow(a.db, remote.store, USER_ID);
    tick(5);
    await a.repos.sleep.update(USER_ID, sleep.id, { date: '2026-10-05', bedtimeAt: '2026-10-04T23:00:00.000Z', wakeAt: '2026-10-05T07:00:00.000Z', quality: 3 });
    await syncNow(a.db, remote.store, USER_ID);
    expect((await a.repos.sleep.getByDate(USER_ID, '2026-10-05'))?.quality).toBe(3);
    expect(remote.tables.get('sleep_records')!.get(sleep.id)?.quality).toBe(3);
  });

  it('borrar los registros también los borra de la nube, pero conserva cuenta y consentimientos', async () => {
    const remote = memoryRemote();
    const a = await phone();
    await a.repos.account.updateProfile(USER_ID, { name: 'Ana' });
    await a.repos.episodes.create(USER_ID, episodeInput());
    await syncNow(a.db, remote.store, USER_ID);
    await deleteRemoteRecords(remote.store, USER_ID);
    expect(remote.count('headache_episodes')).toBe(0);
    expect(remote.count('symptoms')).toBe(0);
    expect(remote.count('consents')).toBe(3);
    expect(remote.count('profiles')).toBe(1);
  });
});
