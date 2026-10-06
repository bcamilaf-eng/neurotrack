import { createRepositories, type Repositories } from '../../src/data/repositories';
import { LATEST_SCHEMA_VERSION, migrate } from '../../src/data/db/migrations';
import { CURRENT_CONSENT_VERSION } from '../../src/domain/catalogs';
import { DuplicateError, NotFoundError, ValidationError } from '../../src/domain/errors';
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

describe('migraciones', () => {
  it('crean todas las tablas y son idempotentes', async () => {
    expect(await migrate(db)).toBe(LATEST_SCHEMA_VERSION);
    const tables = db.raw
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`)
      .all()
      .map((t: any) => t.name);
    expect(tables).toEqual(
      expect.arrayContaining([
        'users', 'user_settings', 'emergency_contacts', 'consents', 'headache_episodes',
        'episode_events', 'symptoms', 'aura_details', 'triggers', 'medications',
        'sleep_records', 'hydration_records', 'meal_records', 'daily_records', 'alarm_flags',
      ]),
    );
  });

  it('la base rechaza datos imposibles aunque se salten la validación', () => {
    expect(() =>
      db.raw
        .prepare(
          `INSERT INTO headache_episodes (id, user_id, created_at, updated_at, date, started_at, ongoing, type, intensity, max_intensity)
           VALUES ('x', ?, 'a', 'a', '2026-10-05', '2026-10-05T10:00:00Z', 1, 'migraine', 12, 12)`,
        )
        .run(USER_ID),
    ).toThrow(/CHECK/);
  });
});

describe('episodios', () => {
  it('registra un episodio con síntomas, aura y desencadenantes', async () => {
    const saved = await repos.episodes.create(
      USER_ID,
      episodeInput({ symptoms: [{ type: 'aura' }, { type: 'nausea' }], aura: { types: ['visual'], durationMin: 25 } }),
    );
    expect(saved.date).toBe('2026-10-05');
    expect(saved.durationMin).toBe(240);
    expect(saved.symptoms.map((s) => s.type)).toEqual(['aura', 'nausea']);
    expect(saved.aura).toEqual({ types: ['visual'], durationMin: 25 });
    expect(saved.triggers).toEqual([{ type: 'sleep_deprivation' }]);
    expect(saved.locations).toEqual(['unilateral_left', 'temporal']);
  });

  it('no guarda nada si los datos son inválidos', async () => {
    await expect(repos.episodes.create(USER_ID, episodeInput({ intensity: 14 }))).rejects.toBeInstanceOf(ValidationError);
    expect(await repos.episodes.listBetween(USER_ID, '2026-01-01', '2026-12-31')).toHaveLength(0);
  });

  it('edita un episodio y reemplaza sus síntomas', async () => {
    const saved = await repos.episodes.create(USER_ID, episodeInput());
    const edited = await repos.episodes.update(USER_ID, saved.id, {
      ...repos.episodes.toInput(saved),
      intensity: 5,
      symptoms: [{ type: 'fatigue' }],
    });
    expect(edited.intensity).toBe(5);
    expect(edited.symptoms).toEqual([{ type: 'fatigue' }]);
  });

  it('elimina un episodio con borrado lógico y conserva la medicación desvinculada', async () => {
    const saved = await repos.episodes.create(USER_ID, episodeInput());
    const med = await repos.medications.create(USER_ID, {
      episodeId: saved.id,
      name: 'Ibuprofeno',
      doseValue: 400,
      doseUnit: 'mg',
      takenAt: '2026-10-05T18:00:00.000Z',
    });
    await repos.episodes.remove(USER_ID, saved.id);
    expect(await repos.episodes.get(USER_ID, saved.id)).toBeNull();
    expect((await repos.medications.get(USER_ID, med.id))?.episodeId).toBeUndefined();
    const raw = db.raw.prepare(`SELECT deleted_at FROM headache_episodes WHERE id = ?`).get(saved.id) as any;
    expect(raw.deleted_at).toBe(NOW.toISOString());
    await expect(repos.episodes.remove(USER_ID, saved.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('un episodio en curso choca con otro que empieza después', async () => {
    await repos.episodes.create(USER_ID, episodeInput({ startedAt: '2026-10-06T09:00:00.000Z', endedAt: undefined, ongoing: true }));
    const later = episodeInput({ startedAt: '2026-10-06T11:00:00.000Z', endedAt: undefined, ongoing: true });
    await expect(repos.episodes.create(USER_ID, later)).rejects.toBeInstanceOf(DuplicateError);
  });

  it('avisa de un episodio duplicado (solapado) y permite guardarlo si el usuario lo confirma', async () => {
    const first = await repos.episodes.create(USER_ID, episodeInput());
    const overlapping = episodeInput({ startedAt: '2026-10-05T20:00:00.000Z', endedAt: '2026-10-05T22:00:00.000Z' });
    const error = await repos.episodes.create(USER_ID, overlapping).catch((e) => e);
    expect(error).toBeInstanceOf(DuplicateError);
    expect(error.existingId).toBe(first.id);
    await expect(repos.episodes.create(USER_ID, overlapping, { allowOverlap: true })).resolves.toBeDefined();
  });

  it('no considera duplicado al propio episodio al editarlo ni a episodios de otro usuario', async () => {
    const saved = await repos.episodes.create(USER_ID, episodeInput());
    await expect(repos.episodes.update(USER_ID, saved.id, repos.episodes.toInput(saved))).resolves.toBeDefined();
    await expect(repos.episodes.create(OTHER_USER_ID, episodeInput())).resolves.toBeDefined();
  });

  it('aísla los datos por usuario', async () => {
    const saved = await repos.episodes.create(USER_ID, episodeInput());
    expect(await repos.episodes.get(OTHER_USER_ID, saved.id)).toBeNull();
    await expect(repos.episodes.remove(OTHER_USER_ID, saved.id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await repos.episodes.listBetween(OTHER_USER_ID, '2026-01-01', '2026-12-31')).toHaveLength(0);
  });

  it('registra la línea temporal y actualiza la intensidad máxima', async () => {
    const saved = await repos.episodes.create(
      USER_ID,
      episodeInput({ startedAt: '2026-10-06T09:00:00.000Z', endedAt: undefined, ongoing: true, intensity: 6 }),
    );
    await repos.episodes.addEvent(USER_ID, saved.id, { at: '2026-10-06T10:00:00.000Z', kind: 'pain', intensity: 8 });
    await repos.episodes.addEvent(USER_ID, saved.id, { at: '2026-10-06T10:30:00.000Z', kind: 'note', note: 'Tomé ibuprofeno' });
    await repos.episodes.addEvent(USER_ID, saved.id, { at: '2026-10-06T11:00:00.000Z', kind: 'pain', intensity: 3 });
    expect((await repos.episodes.getOrThrow(USER_ID, saved.id)).maxIntensity).toBe(8);
    expect((await repos.episodes.listEvents(USER_ID, saved.id)).map((e) => e.intensity ?? e.note)).toEqual([
      8,
      'Tomé ibuprofeno',
      3,
    ]);
    await expect(
      repos.episodes.addEvent(USER_ID, saved.id, { at: '2026-10-06T08:00:00.000Z', kind: 'pain', intensity: 2 }),
    ).rejects.toBeInstanceOf(ValidationError);

    const closed = await repos.episodes.close(USER_ID, saved.id, '2026-10-06T11:30:00.000Z');
    expect(closed.ongoing).toBe(false);
    expect(closed.durationMin).toBe(150);
    expect(closed.maxIntensity).toBe(8);
    expect((await repos.episodes.ongoing(USER_ID))).toHaveLength(0);
  });
});

describe('medicación y hábitos', () => {
  it('registra, edita y elimina una toma de medicación', async () => {
    const med = await repos.medications.create(USER_ID, {
      name: 'Paracetamol',
      doseValue: 1,
      doseUnit: 'g',
      takenAt: '2026-10-05T18:00:00.000Z',
      prescribedByProfessional: true,
    });
    expect(med.date).toBe('2026-10-05');
    expect(med.prescribedByProfessional).toBe(true);
    const edited = await repos.medications.update(USER_ID, med.id, {
      ...med,
      response: 'complete',
      minutesToRelief: 45,
    });
    expect(edited.response).toBe('complete');
    await repos.medications.remove(USER_ID, med.id);
    expect(await repos.medications.listBetween(USER_ID, '2026-10-01', '2026-10-31')).toHaveLength(0);
  });

  it('guarda un único registro de sueño por día y calcula las horas', async () => {
    const input = {
      date: '2026-10-06',
      bedtimeAt: '2026-10-05T23:00:00.000Z',
      wakeAt: '2026-10-06T05:00:00.000Z',
      quality: 2,
      insomnia: true,
    };
    await repos.sleep.create(USER_ID, input);
    const row = db.raw.prepare(`SELECT hours FROM sleep_records`).get() as any;
    expect(row.hours).toBe(6);
    await expect(repos.sleep.create(USER_ID, input)).rejects.toBeInstanceOf(DuplicateError);
    const updated = await repos.sleep.upsertForDay(USER_ID, { ...input, quality: 4 });
    expect(updated.quality).toBe(4);
    expect(await repos.sleep.listBetween(USER_ID, '2026-10-01', '2026-10-31')).toHaveLength(1);
  });

  it('permite volver a registrar un día después de eliminar su registro', async () => {
    const day = await repos.hydration.create(USER_ID, { date: '2026-10-06', amountMl: 1200, glasses: 5 });
    await repos.hydration.remove(USER_ID, day.id);
    await expect(repos.hydration.create(USER_ID, { date: '2026-10-06', amountMl: 800 })).resolves.toBeDefined();
  });

  it('registra comidas con su lista de alimentos', async () => {
    const meal = await repos.meals.create(USER_ID, {
      date: '2026-10-06',
      mealType: 'lunch',
      time: '13:30',
      foods: ['queso curado', 'vino tinto'],
    });
    expect(meal.foods).toEqual(['queso curado', 'vino tinto']);
  });

  it('registra el estado diario y el día sin dolor', async () => {
    const day = await repos.daily.upsertForDay(USER_ID, { date: '2026-10-06', stress: 8, painFree: true });
    expect(day.painFree).toBe(true);
    expect(day.stress).toBe(8);
  });
});

describe('cuenta', () => {
  it('guarda el perfil opcional y los ajustes', async () => {
    const profile = await repos.account.updateProfile(USER_ID, { name: 'Ana', weightKg: 60, sex: 'female' });
    expect(profile).toMatchObject({ name: 'Ana', weightKg: 60, sex: 'female', email: 'ana@ejemplo.com' });
    const settings = await repos.account.updateSettings(USER_ID, { biometricLock: true });
    expect(settings.biometricLock).toBe(true);
    expect((await repos.account.getSettings(USER_ID)).biometricLock).toBe(true);
  });

  it('guarda y reemplaza el contacto de emergencia', async () => {
    await repos.account.saveEmergencyContact(USER_ID, { name: 'Luis', phone: '+34 600 000 000' });
    const contact = await repos.account.saveEmergencyContact(USER_ID, { name: 'Marta', phone: '600111222' });
    expect(contact.name).toBe('Marta');
    await expect(repos.account.saveEmergencyContact(USER_ID, { name: 'X', phone: 'abc' })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('exige los consentimientos obligatorios en su versión vigente y guarda el historial', async () => {
    expect(await repos.account.hasRequiredConsents(USER_ID)).toBe(false);
    await repos.account.recordConsents(USER_ID, [
      { type: 'terms', accepted: true, version: CURRENT_CONSENT_VERSION },
      { type: 'health_data', accepted: true, version: CURRENT_CONSENT_VERSION },
      { type: 'cloud_sync', accepted: false, version: CURRENT_CONSENT_VERSION },
    ]);
    expect(await repos.account.hasRequiredConsents(USER_ID)).toBe(true);

    setClock(() => new Date(NOW.getTime() + 60_000));
    await repos.account.recordConsents(USER_ID, [{ type: 'health_data', accepted: false, version: CURRENT_CONSENT_VERSION }]);
    expect(await repos.account.hasRequiredConsents(USER_ID)).toBe(false);
    expect(db.raw.prepare(`SELECT COUNT(*) AS n FROM consents WHERE user_id = ?`).get(USER_ID)).toEqual({ n: 4 });
  });

  it('elimina todos los datos clínicos conservando la cuenta, o la cuenta completa', async () => {
    await repos.episodes.create(USER_ID, episodeInput());
    await repos.episodes.create(OTHER_USER_ID, episodeInput());
    await repos.account.deleteAllData(USER_ID, { keepAccount: true });
    expect(await repos.episodes.listBetween(USER_ID, '2026-01-01', '2026-12-31')).toHaveLength(0);
    expect(await repos.account.getProfile(USER_ID)).not.toBeNull();
    expect(await repos.episodes.listBetween(OTHER_USER_ID, '2026-01-01', '2026-12-31')).toHaveLength(1);

    await repos.account.deleteAllData(USER_ID, { keepAccount: false });
    expect(await repos.account.getProfile(USER_ID)).toBeNull();
  });
});
