import { episodeInputSchema, episodeDuration, intervalsOverlap, isLongEpisode } from '../../src/domain/entities/episode';
import { medicationInputSchema } from '../../src/domain/entities/medication';
import {
  dailyRecordInputSchema,
  hydrationInputSchema,
  hydrationProgress,
  mealInputSchema,
  sleepHours,
  sleepInputSchema,
} from '../../src/domain/entities/habits';
import { emailSchema, passwordSchema, profileInputSchema, signUpSchema } from '../../src/domain/entities/user';
import { painBand } from '../../src/domain/catalogs';
import { fieldErrors } from '../../src/domain/validation/common';
import { resetClock, setClock } from '../../src/utils/clock';
import { episodeInput, NOW } from '../fixtures/factories';

beforeEach(() => setClock(() => NOW));
afterEach(() => resetClock());

const errorsOf = (result: { success: boolean; error?: any }) =>
  result.success ? {} : fieldErrors(result.error);

describe('episodio', () => {
  it('acepta un episodio completo y calcula su duración', () => {
    const result = episodeInputSchema.safeParse(episodeInput());
    expect(result.success).toBe(true);
    expect(episodeDuration(result.data!)).toBe(240);
  });

  it('exige hora de término salvo que el episodio continúe', () => {
    const errors = errorsOf(episodeInputSchema.safeParse(episodeInput({ endedAt: undefined })));
    expect(errors.endedAt).toMatch(/hora de término/);
    expect(episodeInputSchema.safeParse(episodeInput({ endedAt: undefined, ongoing: true })).success).toBe(true);
  });

  it('rechaza un fin anterior al inicio', () => {
    const errors = errorsOf(
      episodeInputSchema.safeParse(episodeInput({ endedAt: '2026-10-05T16:00:00.000Z' })),
    );
    expect(errors.endedAt).toMatch(/posterior/);
  });

  it('acepta episodios que cruzan la medianoche', () => {
    const result = episodeInputSchema.safeParse(
      episodeInput({ startedAt: '2026-10-04T22:30:00.000Z', endedAt: '2026-10-05T02:00:00.000Z' }),
    );
    expect(result.success).toBe(true);
    expect(episodeDuration(result.data!)).toBe(210);
  });

  it('rechaza episodios de más de 7 días y avisa a partir de 72 h', () => {
    expect(
      episodeInputSchema.safeParse(
        episodeInput({ startedAt: '2026-09-20T10:00:00.000Z', endedAt: '2026-10-05T10:00:00.000Z' }),
      ).success,
    ).toBe(false);
    expect(isLongEpisode({ startedAt: '2026-10-01T10:00:00.000Z', endedAt: '2026-10-05T10:00:00.000Z' })).toBe(true);
  });

  it('rechaza fechas futuras', () => {
    const errors = errorsOf(
      episodeInputSchema.safeParse(episodeInput({ startedAt: '2026-10-07T10:00:00.000Z', endedAt: undefined, ongoing: true })),
    );
    expect(errors.startedAt).toMatch(/futura/);
  });

  it.each([-1, 11, 5.5, Number.NaN])('rechaza intensidad %p', (intensity) => {
    expect(episodeInputSchema.safeParse(episodeInput({ intensity })).success).toBe(false);
  });

  it.each([0, 10])('acepta los extremos de la escala (%p)', (intensity) => {
    expect(episodeInputSchema.safeParse(episodeInput({ intensity })).success).toBe(true);
  });

  it('pide detalle cuando se elige «Otro»', () => {
    const errors = errorsOf(episodeInputSchema.safeParse(episodeInput({ type: 'other' })));
    expect(errors.typeOther).toBeDefined();
  });

  it('solo admite detalle de aura si se marcó el síntoma aura', () => {
    const withoutSymptom = errorsOf(
      episodeInputSchema.safeParse(episodeInput({ aura: { types: ['visual'], durationMin: 20 } })),
    );
    expect(withoutSymptom.aura).toBeDefined();
    const ok = episodeInputSchema.safeParse(
      episodeInput({ symptoms: [{ type: 'aura' }], aura: { types: ['visual'], durationMin: 20 } }),
    );
    expect(ok.success).toBe(true);
  });

  it('no combina «No identificado» con otros desencadenantes ni repite opciones', () => {
    expect(
      episodeInputSchema.safeParse(episodeInput({ triggers: [{ type: 'unidentified' }, { type: 'stress' }] })).success,
    ).toBe(false);
    expect(
      episodeInputSchema.safeParse(episodeInput({ symptoms: [{ type: 'nausea' }, { type: 'nausea' }] })).success,
    ).toBe(false);
  });

  it('elimina localizaciones duplicadas', () => {
    const result = episodeInputSchema.parse(episodeInput({ locations: ['frontal', 'frontal'] }));
    expect(result.locations).toEqual(['frontal']);
  });

  it('detecta solapamiento de intervalos, incluidos episodios en curso', () => {
    const a = { startedAt: '2026-10-05T10:00:00Z', endedAt: '2026-10-05T12:00:00Z' };
    expect(intervalsOverlap(a, { startedAt: '2026-10-05T11:00:00Z', endedAt: '2026-10-05T13:00:00Z' })).toBe(true);
    expect(intervalsOverlap(a, { startedAt: '2026-10-05T12:00:00Z', endedAt: '2026-10-05T13:00:00Z' })).toBe(false);
    expect(intervalsOverlap(a, { startedAt: '2026-10-05T09:00:00Z', endedAt: null }, NOW)).toBe(true);
  });
});

describe('escala de dolor', () => {
  it.each([
    [0, 'Sin dolor'],
    [2, 'Leve'],
    [5, 'Moderado'],
    [8, 'Intenso'],
    [10, 'Máximo dolor imaginable'],
  ])('%p → %p', (value, label) => expect(painBand(value)).toBe(label));
});

describe('medicación', () => {
  const valid = {
    name: 'Ibuprofeno',
    doseValue: 400,
    doseUnit: 'mg' as const,
    takenAt: '2026-10-05T18:00:00.000Z',
    response: 'partial' as const,
  };

  it('acepta una toma válida', () => {
    expect(medicationInputSchema.safeParse(valid).success).toBe(true);
  });

  it.each([0, -5, 20000])('rechaza la dosis %p', (doseValue) => {
    expect(errorsOf(medicationInputSchema.safeParse({ ...valid, doseValue })).doseValue).toBeDefined();
  });

  it('exige nombre y unidad', () => {
    const errors = errorsOf(medicationInputSchema.safeParse({ ...valid, name: '  ', doseUnit: undefined }));
    expect(errors.name).toBeDefined();
    expect(errors.doseUnit).toBeDefined();
  });
});

describe('hábitos', () => {
  it('calcula las horas de sueño y exige que levantarse sea posterior a acostarse', () => {
    const sleep = {
      date: '2026-10-06',
      bedtimeAt: '2026-10-05T22:30:00.000Z',
      wakeAt: '2026-10-06T06:00:00.000Z',
      quality: 3,
    };
    expect(sleepHours(sleepInputSchema.parse(sleep))).toBe(7.5);
    expect(sleepInputSchema.safeParse({ ...sleep, wakeAt: '2026-10-05T21:00:00.000Z' }).success).toBe(false);
    expect(sleepInputSchema.safeParse({ ...sleep, quality: 6 }).success).toBe(false);
  });

  it('calcula el progreso de hidratación con tope en el 100 %', () => {
    const data = hydrationInputSchema.parse({ date: '2026-10-06', amountMl: 1500 });
    expect(hydrationProgress(data)).toBe(0.75);
    expect(hydrationProgress({ amountMl: 3000, goalMl: 2000 })).toBe(1);
  });

  it('pide la hora de la comida, o las horas si fue ayuno', () => {
    expect(mealInputSchema.safeParse({ date: '2026-10-06', mealType: 'lunch' }).success).toBe(false);
    expect(mealInputSchema.safeParse({ date: '2026-10-06', mealType: 'lunch', time: '13:30' }).success).toBe(true);
    expect(mealInputSchema.safeParse({ date: '2026-10-06', mealType: 'breakfast', fasting: true }).success).toBe(false);
  });

  it('valida las escalas subjetivas del registro diario', () => {
    expect(dailyRecordInputSchema.safeParse({ date: '2026-10-06', stress: 7, mood: 3 }).success).toBe(true);
    expect(dailyRecordInputSchema.safeParse({ date: '2026-10-06', stress: 11 }).success).toBe(false);
    expect(dailyRecordInputSchema.safeParse({ date: '2026-10-07' }).success).toBe(false);
    expect(dailyRecordInputSchema.safeParse({ date: '2026-02-30' }).success).toBe(false);
  });
});

describe('cuenta y perfil', () => {
  it('normaliza el email y rechaza formatos inválidos', () => {
    expect(emailSchema.parse('  Ana@Ejemplo.COM ')).toBe('ana@ejemplo.com');
    expect(emailSchema.safeParse('ana@').success).toBe(false);
  });

  it('exige contraseñas de al menos 10 caracteres con letras y números', () => {
    expect(passwordSchema.safeParse('corta1').success).toBe(false);
    expect(passwordSchema.safeParse('solamenteletras').success).toBe(false);
    expect(passwordSchema.safeParse('cefalea2026').success).toBe(true);
  });

  it('comprueba que las contraseñas coincidan', () => {
    const errors = errorsOf(
      signUpSchema.safeParse({ email: 'a@b.com', password: 'cefalea2026', confirmPassword: 'cefalea2027' }),
    );
    expect(errors.confirmPassword).toMatch(/no coinciden/);
  });

  it('acepta un perfil vacío (todo es opcional) y valida rangos', () => {
    expect(profileInputSchema.safeParse({}).success).toBe(true);
    expect(profileInputSchema.safeParse({ weightKg: 5 }).success).toBe(false);
    expect(profileInputSchema.safeParse({ birthDate: '1880-01-01' }).success).toBe(false);
    expect(profileInputSchema.safeParse({ name: '', country: '' }).data).toEqual({});
  });
});
