import { createRepositories, type Repositories } from '../../src/data/repositories';
import { type HealthSnapshot, planImport } from '../../src/domain/healthImport';
import { applyImport } from '../../src/services/health/importer';
import { resetClock, setClock } from '../../src/utils/clock';
import { NOW, USER_ID } from '../fixtures/factories';
import { createTestDatabase } from '../fixtures/testDatabase';

let db: Awaited<ReturnType<typeof createTestDatabase>>;
let repos: Repositories;

const empty: HealthSnapshot = { weight: [], height: [], sleep: [], hydration: [], menstruationFlow: [], menstruationPeriods: [] };

beforeEach(async () => {
  setClock(() => NOW);
  db = await createTestDatabase();
  repos = createRepositories(db);
  await repos.account.ensureUser(USER_ID, 'ana@ejemplo.com');
  await repos.account.updateProfile(USER_ID, { name: 'Ana', occupation: 'Enfermera' });
});

afterEach(async () => {
  resetClock();
  await db.close();
});

describe('plan de importación', () => {
  it('usa el peso y la altura más recientes y descarta valores imposibles', () => {
    const plan = planImport(
      {
        ...empty,
        weight: [
          { time: '2026-10-01T08:00:00Z', value: 64.24 },
          { time: '2026-10-05T08:00:00Z', value: 63.9 },
        ],
        height: [{ time: '2026-09-01T08:00:00Z', value: 9 }],
      },
      'health_connect',
    );
    expect(plan.weightKg).toBe(63.9);
    expect(plan.heightCm).toBeUndefined();
  });

  it('agrupa sueño por día de despertar, agua por día y días de menstruación', () => {
    const plan = planImport(
      {
        ...empty,
        sleep: [
          { startTime: '2026-10-04T22:30:00Z', endTime: '2026-10-05T06:30:00Z' },
          { startTime: '2026-10-05T14:00:00Z', endTime: '2026-10-05T14:30:00Z' },
        ],
        hydration: [
          { startTime: '2026-10-05T09:00:00Z', endTime: '2026-10-05T09:00:00Z', volumeMl: 250 },
          { startTime: '2026-10-05T15:00:00Z', endTime: '2026-10-05T15:00:00Z', volumeMl: 500 },
        ],
        menstruationFlow: [{ time: '2026-10-02T10:00:00Z' }],
        menstruationPeriods: [{ startTime: '2026-10-03T00:00:00Z', endTime: '2026-10-04T00:00:00Z' }],
      },
      'health_connect',
    );
    expect(plan.sleep).toEqual([
      { date: '2026-10-05', bedtimeAt: '2026-10-04T22:30:00Z', wakeAt: '2026-10-05T06:30:00Z', source: 'health_connect' },
    ]);
    expect(plan.hydration).toEqual([{ date: '2026-10-05', amountMl: 750 }]);
    expect(plan.menstruationDays).toEqual(['2026-10-02', '2026-10-03', '2026-10-04']);
  });
});

describe('aplicar la importación', () => {
  it('importa sin pisar lo escrito a mano y sin tocar el resto del perfil', async () => {
    await repos.sleep.create(USER_ID, {
      date: '2026-10-04',
      bedtimeAt: '2026-10-03T23:00:00Z',
      wakeAt: '2026-10-04T07:00:00Z',
      quality: 4,
    });

    const summary = await applyImport(
      repos,
      USER_ID,
      planImport(
        {
          ...empty,
          weight: [{ time: '2026-10-05T08:00:00Z', value: 63.9 }],
          sleep: [
            { startTime: '2026-10-03T22:00:00Z', endTime: '2026-10-04T05:00:00Z' },
            { startTime: '2026-10-04T23:00:00Z', endTime: '2026-10-05T06:00:00Z' },
          ],
          hydration: [{ startTime: '2026-10-05T09:00:00Z', endTime: '2026-10-05T09:00:00Z', volumeMl: 1200 }],
          menstruationFlow: [{ time: '2026-10-05T10:00:00Z' }],
        },
        'health_connect',
      ),
    );

    expect(summary).toMatchObject({ profile: ['peso'], sleepNights: 1, hydrationDays: 1, menstruationDays: 1, skippedManual: 1 });
    expect(await repos.account.getProfile(USER_ID)).toMatchObject({ name: 'Ana', occupation: 'Enfermera', weightKg: 63.9 });
    expect(await repos.sleep.getByDate(USER_ID, '2026-10-04')).toMatchObject({ quality: 4, source: 'manual' });
    const imported = await repos.sleep.getByDate(USER_ID, '2026-10-05');
    expect(imported).toMatchObject({ source: 'health_connect' });
    expect(imported?.quality).toBeUndefined();
    expect(await repos.hydration.getByDate(USER_ID, '2026-10-05')).toMatchObject({ amountMl: 1200, source: 'health_connect' });
    expect((await repos.daily.getByDate(USER_ID, '2026-10-05'))?.menstruation).toBe(true);
    expect(await repos.account.getHealthImport(USER_ID)).toBe(NOW.toISOString());
  });

  it('volver a importar actualiza lo importado en vez de duplicarlo', async () => {
    const snapshot = (ml: number): HealthSnapshot => ({
      ...empty,
      hydration: [{ startTime: '2026-10-05T09:00:00Z', endTime: '2026-10-05T09:00:00Z', volumeMl: ml }],
    });
    await applyImport(repos, USER_ID, planImport(snapshot(500), 'health_connect'));
    await applyImport(repos, USER_ID, planImport(snapshot(900), 'health_connect'));
    const days = await repos.hydration.listBetween(USER_ID, '2026-10-01', '2026-10-06');
    expect(days).toHaveLength(1);
    expect(days[0].amountMl).toBe(900);
  });
});
