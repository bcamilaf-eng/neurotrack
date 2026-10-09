import { episodeInputSchema } from '../../src/domain/entities/episode';
import { ValidationError } from '../../src/domain/errors';
import { draftToInput, emptyDraft, inputToDraft, toggleTrigger } from '../../src/domain/usecases/episodeDraft';
import { resetClock, setClock } from '../../src/utils/clock';

const NOW = new Date('2026-10-06T12:00:00Z');
beforeEach(() => setClock(() => NOW));
afterEach(() => resetClock());

describe('borrador de episodio', () => {
  it('empieza en curso, con la fecha y hora actuales', () => {
    const draft = emptyDraft(NOW);
    expect(draft).toMatchObject({ date: '2026-10-06', startTime: '12:00', ongoing: true });
  });

  it('pide fecha, hora e intensidad antes de convertir', () => {
    const error = (() => {
      try {
        draftToInput({ ...emptyDraft(NOW), startTime: '25:00' });
      } catch (e) {
        return e as ValidationError;
      }
    })();
    expect(error).toBeInstanceOf(ValidationError);
    expect(Object.keys(error!.fields).sort()).toEqual(['intensity', 'startTime']);
  });

  it('respeta una fecha de término explícita para episodios de varios días', () => {
    const draft = { ...emptyDraft(NOW), date: '2026-10-02', startTime: '08:00', ongoing: false, endDate: '2026-10-04', endTime: '09:30', intensity: 6 };
    const input = draftToInput(draft);
    expect(input.endedAt).toBe('2026-10-04T09:30:00.000Z');
    expect(inputToDraft(input)).toMatchObject({ endDate: '2026-10-04', endTime: '09:30' });
  });

  it('interpreta una hora de fin menor como el día siguiente', () => {
    const input = draftToInput({
      ...emptyDraft(NOW),
      date: '2026-10-04',
      startTime: '22:30',
      ongoing: false,
      endTime: '01:15',
      intensity: 7,
    });
    expect(input.startedAt).toBe('2026-10-04T22:30:00.000Z');
    expect(input.endedAt).toBe('2026-10-05T01:15:00.000Z');
    expect(episodeInputSchema.safeParse(input).success).toBe(true);
  });

  it('conserva aura, alimento concreto y notas al ir y volver del formulario', () => {
    const draft = {
      ...emptyDraft(NOW),
      date: '2026-10-05',
      startTime: '08:00',
      ongoing: false,
      endTime: '10:00',
      intensity: 6,
      symptoms: ['aura' as const, 'nausea' as const],
      auraTypes: ['visual' as const],
      auraDuration: '20',
      triggers: ['specific_food' as const],
      foodDetail: 'chocolate',
      notes: '  ',
    };
    const input = draftToInput(draft);
    expect(input.aura).toEqual({ types: ['visual'], durationMin: 20 });
    expect(input.triggers).toEqual([{ type: 'specific_food', detail: 'chocolate' }]);
    expect(input.notes).toBeUndefined();
    expect(inputToDraft(input)).toMatchObject({ auraTypes: ['visual'], auraDuration: '20', foodDetail: 'chocolate' });
  });

  it('descarta el detalle de aura si se desmarca el síntoma', () => {
    const input = draftToInput({
      ...emptyDraft(NOW),
      intensity: 5,
      symptoms: ['nausea'],
      auraTypes: ['visual'],
    });
    expect(input.aura).toBeUndefined();
  });

  it('«No identificado» excluye a los demás desencadenantes', () => {
    expect(toggleTrigger(['stress'], 'unidentified')).toEqual(['unidentified']);
    expect(toggleTrigger(['unidentified'], 'stress')).toEqual(['stress']);
    expect(toggleTrigger(['stress', 'noise'], 'stress')).toEqual(['noise']);
  });
});
