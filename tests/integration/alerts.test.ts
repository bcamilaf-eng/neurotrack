import { createRepositories, type Repositories } from '../../src/data/repositories';
import { ALARM_RULES_VERSION } from '../../src/domain/alerts/rules';
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
});

afterEach(async () => {
  resetClock();
  await db.close();
});

describe('señales de alarma guardadas', () => {
  it('se registran al crear el episodio, con la versión de las reglas', async () => {
    const e = await repos.episodes.create(USER_ID, episodeInput({ intensity: 9, suddenOnset: true, headTrauma: true }));
    expect(e).toMatchObject({ suddenOnset: true, headTrauma: true });
    const flags = await repos.alarms.listForEpisode(USER_ID, e.id);
    expect(flags.map((f) => f.signal)).toEqual(['head_trauma', 'sudden_severe']);
    expect(flags[0]).toMatchObject({ rulesVersion: ALARM_RULES_VERSION, detectedAt: NOW.toISOString(), shownAt: undefined });
    expect(await repos.alarms.listForEpisode(OTHER_USER_ID, e.id)).toEqual([]);
  });

  it('al editar, desaparecen las que ya no se cumplen y se conservan las demás', async () => {
    const e = await repos.episodes.create(USER_ID, episodeInput({ intensity: 9, suddenOnset: true, headTrauma: true }));
    await repos.alarms.acknowledge(USER_ID, e.id);
    await repos.episodes.update(USER_ID, e.id, { ...repos.episodes.toInput(e), suddenOnset: false });
    const flags = await repos.alarms.listForEpisode(USER_ID, e.id);
    expect(flags.map((f) => f.signal)).toEqual(['head_trauma']);
    expect(flags[0].acknowledgedAt).toBe(NOW.toISOString());
  });

  it('una actualización de intensidad en curso puede activar una señal', async () => {
    await repos.account.updateProfile(USER_ID, { pregnantOrPostpartum: true });
    const e = await repos.episodes.create(USER_ID, episodeInput({ intensity: 5, endedAt: undefined, ongoing: true, startedAt: '2026-10-06T09:00:00.000Z' }));
    expect(await repos.alarms.listForEpisode(USER_ID, e.id)).toEqual([]);
    await repos.episodes.addEvent(USER_ID, e.id, { at: '2026-10-06T10:00:00.000Z', kind: 'pain', intensity: 8 });
    expect((await repos.alarms.listForEpisode(USER_ID, e.id)).map((f) => f.signal)).toEqual(['pregnancy']);
  });

  it('un entumecimiento que ya apareció con aura no es señal', async () => {
    const first = await repos.episodes.create(USER_ID, episodeInput({ symptoms: [{ type: 'numbness' }] }));
    expect((await repos.alarms.listForEpisode(USER_ID, first.id)).map((f) => f.signal)).toEqual(['focal_deficit']);
    await repos.episodes.create(
      USER_ID,
      episodeInput({ startedAt: '2026-09-20T10:00:00.000Z', endedAt: '2026-09-20T12:00:00.000Z', symptoms: [{ type: 'aura' }, { type: 'numbness' }] }),
    );
    const later = await repos.episodes.create(
      USER_ID,
      episodeInput({ startedAt: '2026-10-06T08:00:00.000Z', endedAt: '2026-10-06T10:00:00.000Z', symptoms: [{ type: 'numbness' }] }),
    );
    expect(await repos.alarms.listForEpisode(USER_ID, later.id)).toEqual([]);
  });

  it('marca cuándo se mostró, cuándo se reconoció y se borra con el episodio', async () => {
    const e = await repos.episodes.create(USER_ID, episodeInput({ symptoms: [{ type: 'seizure' }] }));
    await repos.alarms.markShown(USER_ID, e.id);
    await repos.alarms.acknowledge(USER_ID, e.id);
    const [flag] = await repos.alarms.listForEpisode(USER_ID, e.id);
    expect(flag).toMatchObject({ signal: 'seizure', shownAt: NOW.toISOString(), acknowledgedAt: NOW.toISOString() });
    expect(await repos.alarms.listBetween(USER_ID, '2026-10-01', '2026-10-06')).toHaveLength(1);
    await repos.episodes.remove(USER_ID, e.id);
    expect(await repos.alarms.listBetween(USER_ID, '2026-10-01', '2026-10-06')).toEqual([]);
  });
});
