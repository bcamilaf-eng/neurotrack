import { createRepositories, type Repositories } from '../../src/data/repositories';
import { DuplicateError, ValidationError } from '../../src/domain/errors';
import type { MedicationInput } from '../../src/domain/entities/medication';
import { resetClock, setClock } from '../../src/utils/clock';
import { episodeInput, NOW, OTHER_USER_ID, USER_ID } from '../fixtures/factories';
import { createTestDatabase } from '../fixtures/testDatabase';

let db: Awaited<ReturnType<typeof createTestDatabase>>;
let repos: Repositories;

const dose = (overrides: Partial<MedicationInput> = {}): MedicationInput => ({
  name: 'Ibuprofeno',
  doseValue: 400,
  doseUnit: 'mg',
  takenAt: '2026-10-05T18:00:00.000Z',
  ...overrides,
});

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

describe('medicación', () => {
  it('se vincula a un episodio propio y se lista con él', async () => {
    const episode = await repos.episodes.create(USER_ID, episodeInput());
    const taken = await repos.medications.create(USER_ID, dose({ episodeId: episode.id, response: 'partial', minutesToRelief: 45 }));
    await repos.medications.create(USER_ID, dose({ name: 'Otra', takenAt: '2026-10-04T08:00:00.000Z' }));

    expect(taken).toMatchObject({ date: '2026-10-05', episodeId: episode.id, response: 'partial', minutesToRelief: 45 });
    expect((await repos.medications.listForEpisode(USER_ID, episode.id)).map((m) => m.id)).toEqual([taken.id]);
  });

  it('no permite vincular una toma al episodio de otra persona', async () => {
    const foreign = await repos.episodes.create(OTHER_USER_ID, episodeInput());
    await expect(repos.medications.create(USER_ID, dose({ episodeId: foreign.id }))).rejects.toBeInstanceOf(ValidationError);
    const mine = await repos.medications.create(USER_ID, dose());
    await expect(repos.medications.update(USER_ID, mine.id, dose({ episodeId: foreign.id }))).rejects.toBeInstanceOf(ValidationError);
  });

  it('completar la respuesta más tarde actualiza la toma', async () => {
    const taken = await repos.medications.create(USER_ID, dose());
    const updated = await repos.medications.update(USER_ID, taken.id, dose({ response: 'complete', minutesToRelief: 60, adverseEffects: 'Somnolencia' }));
    expect(updated).toMatchObject({ response: 'complete', minutesToRelief: 60, adverseEffects: 'Somnolencia' });
  });

  it('al eliminar el episodio la toma se conserva sin vincular', async () => {
    const episode = await repos.episodes.create(USER_ID, episodeInput());
    const taken = await repos.medications.create(USER_ID, dose({ episodeId: episode.id }));
    await repos.episodes.remove(USER_ID, episode.id);
    expect((await repos.medications.get(USER_ID, taken.id))?.episodeId).toBeUndefined();
  });

  it('lista las últimas tomas y los medicamentos usados con su última dosis', async () => {
    await repos.medications.create(USER_ID, dose({ takenAt: '2026-10-01T08:00:00.000Z', doseValue: 200 }));
    await repos.medications.create(USER_ID, dose({ name: 'Paracetamol', doseValue: 1, doseUnit: 'g', takenAt: '2026-10-03T08:00:00.000Z' }));
    await repos.medications.create(USER_ID, dose({ name: 'ibuprofeno', takenAt: '2026-10-05T08:00:00.000Z', doseValue: 600 }));
    const deleted = await repos.medications.create(USER_ID, dose({ name: 'Borrado', takenAt: '2026-10-06T08:00:00.000Z' }));
    await repos.medications.remove(USER_ID, deleted.id);
    await repos.medications.create(OTHER_USER_ID, dose({ name: 'Ajeno' }));

    expect((await repos.medications.listRecent(USER_ID)).map((m) => m.takenAt.slice(0, 10))).toEqual(['2026-10-05', '2026-10-03', '2026-10-01']);
    expect(await repos.medications.recentNames(USER_ID)).toEqual([
      { name: 'ibuprofeno', doseValue: 600, doseUnit: 'mg' },
      { name: 'Paracetamol', doseValue: 1, doseUnit: 'g' },
    ]);
  });
});

describe('hábitos diarios', () => {
  it('guarda el sueño con sus horas y evita dos registros de la misma noche', async () => {
    const input = { date: '2026-10-06', bedtimeAt: '2026-10-05T23:00:00.000Z', wakeAt: '2026-10-06T06:30:00.000Z', quality: 4 };
    await repos.sleep.create(USER_ID, input);
    const row = db.raw.prepare('SELECT hours FROM sleep_records').get() as { hours: number };
    expect(row.hours).toBe(7.5);
    await expect(repos.sleep.create(USER_ID, input)).rejects.toBeInstanceOf(DuplicateError);
    const replaced = await repos.sleep.upsertForDay(USER_ID, { ...input, quality: 2 });
    expect(replaced.quality).toBe(2);
    expect(db.raw.prepare('SELECT COUNT(*) AS n FROM sleep_records').get()).toEqual({ n: 1 });
  });

  it('la hidratación del día se reemplaza al volver a guardarla', async () => {
    await repos.hydration.upsertForDay(USER_ID, { date: '2026-10-06', amountMl: 500, glasses: 2 });
    const second = await repos.hydration.upsertForDay(USER_ID, { date: '2026-10-06', amountMl: 1250, glasses: 5 });
    expect(second).toMatchObject({ amountMl: 1250, glasses: 5, goalMl: 2000 });
    expect(await repos.hydration.listBetween(USER_ID, '2026-10-06', '2026-10-06')).toHaveLength(1);
  });

  it('admite varias comidas por día, ordenadas por hora', async () => {
    await repos.meals.create(USER_ID, { date: '2026-10-06', mealType: 'lunch', time: '11:30', foods: ['Queso', 'Pan'] });
    await repos.meals.create(USER_ID, { date: '2026-10-06', mealType: 'breakfast', fasting: true, fastingHours: 14 });
    await repos.meals.create(USER_ID, { date: '2026-10-06', mealType: 'breakfast', time: '08:00', foods: ['Café'] });
    const meals = await repos.meals.listBetween(USER_ID, '2026-10-06', '2026-10-06');
    expect(meals.map((m) => m.time ?? 'ayuno')).toEqual(['ayuno', '08:00', '11:30']);
    expect(meals[2].foods).toEqual(['Queso', 'Pan']);
  });

  it('el estado del día conserva «sin dolor» al completar el resto', async () => {
    await repos.daily.upsertForDay(USER_ID, { date: '2026-10-06', painFree: true });
    const existing = await repos.daily.getByDate(USER_ID, '2026-10-06');
    const updated = await repos.daily.upsertForDay(USER_ID, { ...existing!, stress: 7, mood: 2 });
    expect(updated).toMatchObject({ painFree: true, stress: 7, mood: 2 });
  });
});
