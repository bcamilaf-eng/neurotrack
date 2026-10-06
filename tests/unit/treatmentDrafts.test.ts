import { medicationInputSchema } from '../../src/domain/entities/medication';
import { mealInputSchema } from '../../src/domain/entities/habits';
import { ValidationError } from '../../src/domain/errors';
import {
  addFoods,
  addGlasses,
  emptyHydrationDraft,
  emptyMealDraft,
  emptySleepDraft,
  hydrationDraftToInput,
  mealDraftToInput,
  previewSleepHours,
  sleepDraftToInput,
  sleepToDraft,
} from '../../src/domain/usecases/habitDrafts';
import { emptyMedicationDraft, medicationDraftToInput, medicationToDraft } from '../../src/domain/usecases/medicationDraft';
import { resetClock, setClock } from '../../src/utils/clock';

const NOW = new Date('2026-10-06T12:00:00Z');
beforeEach(() => setClock(() => NOW));
afterEach(() => resetClock());

function fieldsOf(action: () => unknown): Record<string, string> {
  try {
    action();
  } catch (e) {
    if (e instanceof ValidationError) return e.fields;
    throw e;
  }
  return {};
}

describe('borrador de medicación', () => {
  it('lee dosis con coma decimal y combina fecha y hora de la toma', () => {
    const input = medicationDraftToInput({
      ...emptyMedicationDraft(NOW),
      name: 'Ibuprofeno',
      doseValue: '2,5',
      doseUnit: 'mg',
      time: '09:15',
    });
    expect(input).toMatchObject({ doseValue: 2.5, takenAt: '2026-10-06T09:15:00.000Z', prescribedByProfessional: false });
    expect(medicationToDraft(medicationInputSchema.parse(input))).toMatchObject({ doseValue: '2,5', time: '09:15', date: '2026-10-06' });
  });

  it('avisa si la dosis o los minutos no son números', () => {
    const fields = fieldsOf(() =>
      medicationDraftToInput({ ...emptyMedicationDraft(NOW), doseValue: '1,2,3', minutesToRelief: 'x' }),
    );
    expect(Object.keys(fields).sort()).toEqual(['doseValue', 'minutesToRelief']);
  });

  it('pide nombre, dosis y unidad con mensajes en español', () => {
    const result = medicationInputSchema.safeParse(medicationDraftToInput(emptyMedicationDraft(NOW)));
    expect(result.success).toBe(false);
    const messages = result.error!.issues.map((i) => i.message);
    expect(messages).toEqual(expect.arrayContaining(['Este campo es obligatorio.', 'Indica la dosis.', 'Selecciona la unidad de la dosis.']));
  });

  it('no admite tiempo hasta el alivio si no hubo alivio', () => {
    const result = medicationInputSchema.safeParse({
      name: 'Paracetamol',
      doseValue: 1,
      doseUnit: 'g',
      takenAt: '2026-10-06T10:00:00.000Z',
      response: 'none',
      minutesToRelief: 30,
    });
    expect(result.success).toBe(false);
    expect(result.error!.issues[0].path).toEqual(['minutesToRelief']);
  });

  it('no admite tomas en el futuro', () => {
    const result = medicationInputSchema.safeParse(
      medicationDraftToInput({ ...emptyMedicationDraft(NOW), name: 'X', doseValue: '1', doseUnit: 'tablet', time: '18:00' }),
    );
    expect(result.success).toBe(false);
    expect(result.error!.issues[0].message).toBe('La hora no puede ser futura.');
  });
});

describe('borrador de sueño', () => {
  it('entiende que te acostaste la noche anterior', () => {
    const draft = { ...emptySleepDraft('2026-10-06'), bedtime: '23:30', wakeTime: '06:45', quality: 3 };
    expect(previewSleepHours(draft)).toBe(7.3);
    const input = sleepDraftToInput(draft);
    expect(input).toMatchObject({ bedtimeAt: '2026-10-05T23:30:00.000Z', wakeAt: '2026-10-06T06:45:00.000Z' });
  });

  it('una siesta o un turno de noche en el mismo día también vale', () => {
    const input = sleepDraftToInput({ ...emptySleepDraft('2026-10-06'), bedtime: '01:00', wakeTime: '09:00', quality: 2 });
    expect(input.bedtimeAt).toBe('2026-10-06T01:00:00.000Z');
    const draft = sleepToDraft({ ...input, awakenings: 0, insomnia: false, restorative: undefined, notes: undefined } as never);
    expect(draft).toMatchObject({ bedtime: '01:00', wakeTime: '09:00' });
  });

  it('pide la calidad del sueño', () => {
    expect(fieldsOf(() => sleepDraftToInput(emptySleepDraft('2026-10-06')))).toEqual({ quality: 'Indica la calidad del sueño.' });
  });
});

describe('borrador de hidratación', () => {
  it('sumar y quitar vasos mueve también la cantidad, sin bajar de cero', () => {
    let draft = emptyHydrationDraft('2026-10-06');
    draft = addGlasses(addGlasses(draft, 1), 1);
    expect(draft).toMatchObject({ glasses: 2, amountMl: '500' });
    draft = addGlasses({ ...draft, amountMl: '700' }, -1);
    expect(draft).toMatchObject({ glasses: 1, amountMl: '450' });
    draft = addGlasses(addGlasses(draft, -1), -1);
    expect(draft).toMatchObject({ glasses: 0, amountMl: '200' });
  });

  it('convierte los textos y usa el objetivo por defecto si se borra', () => {
    expect(hydrationDraftToInput({ ...emptyHydrationDraft('2026-10-06'), amountMl: '1500', goalMl: '' })).toMatchObject({
      amountMl: 1500,
      goalMl: 2000,
    });
  });
});

describe('borrador de comida', () => {
  it('añade alimentos separados por comas sin repetirlos', () => {
    expect(addFoods(['Queso'], ' chocolate,  queso curado , queso;Café\n')).toEqual(['Queso', 'chocolate', 'queso curado', 'Café']);
  });

  it('un ayuno no guarda alimentos y pide sus horas', () => {
    const draft = { ...emptyMealDraft('2026-10-06', NOW), mealType: 'breakfast' as const, foods: ['pan'], fasting: true };
    const result = mealInputSchema.safeParse(mealDraftToInput(draft));
    expect(result.error!.issues[0].message).toBe('Indica cuántas horas de ayuno.');
    expect(mealDraftToInput({ ...draft, fastingHours: '14,5' })).toMatchObject({ foods: [], fastingHours: 14.5 });
  });

  it('pide el tipo de comida en español', () => {
    const result = mealInputSchema.safeParse(mealDraftToInput(emptyMealDraft('2026-10-06', NOW)));
    expect(result.error!.issues[0].message).toBe('Elige el tipo de comida.');
  });
});
