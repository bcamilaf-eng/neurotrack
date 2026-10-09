import {
  ALARM_MESSAGE,
  type AlarmEpisode,
  emergencyNumber,
  evaluateAlarmSignals,
  isPatternChange,
} from '../../src/domain/alerts/rules';

const episode = (overrides: Partial<AlarmEpisode> = {}): AlarmEpisode => ({
  id: 'e',
  startedAt: '2026-10-05T17:00:00.000Z',
  maxIntensity: 5,
  durationMin: 240,
  symptoms: [],
  ...overrides,
});

const none = { history: [], auraHistorySymptoms: [] };

/** `n` episodios anteriores, uno cada 5 días hacia atrás. */
const history = (n: number, maxIntensity = 5, durationMin: number | null = 240) =>
  Array.from({ length: n }, (_, i) =>
    episode({ id: `h${i}`, startedAt: new Date(Date.parse('2026-10-01T10:00:00Z') - i * 5 * 86_400_000).toISOString(), maxIntensity, durationMin }),
  );

describe('señales de alarma', () => {
  it('usa el mensaje exacto de la especificación', () => {
    expect(ALARM_MESSAGE).toBe(
      'Este registro contiene una señal que puede requerir evaluación médica urgente. Considera buscar atención médica inmediata.',
    );
  });

  it('un episodio corriente no tiene señales', () => {
    expect(evaluateAlarmSignals(episode({ symptoms: [{ type: 'nausea' }] }), none)).toEqual([]);
  });

  it('inicio en menos de un minuto cuenta solo con intensidad 9 o más', () => {
    expect(evaluateAlarmSignals(episode({ suddenOnset: true, maxIntensity: 8 }), none)).toEqual([]);
    expect(evaluateAlarmSignals(episode({ suddenOnset: true, maxIntensity: 9 }), none)).toEqual(['sudden_severe']);
  });

  it('síntomas focales sin antecedente con aura, salvo que ya aparecieran con aura', () => {
    const e = episode({ symptoms: [{ type: 'numbness' }] });
    expect(evaluateAlarmSignals(e, none)).toEqual(['focal_deficit']);
    expect(evaluateAlarmSignals(e, { ...none, auraHistorySymptoms: ['aura', 'numbness'] })).toEqual([]);
    expect(evaluateAlarmSignals(episode({ symptoms: [{ type: 'one_side_weakness' }] }), { ...none, auraHistorySymptoms: ['numbness'] })).toEqual([
      'focal_deficit',
    ]);
  });

  it('conciencia, confusión, convulsiones, fiebre con rigidez y golpe en la cabeza', () => {
    const e = episode({
      headTrauma: true,
      symptoms: [{ type: 'loss_of_consciousness' }, { type: 'confusion' }, { type: 'seizure' }, { type: 'fever' }, { type: 'neck_stiffness' }],
    });
    expect(evaluateAlarmSignals(e, none)).toEqual(['loss_of_consciousness', 'confusion', 'seizure', 'fever_neck_stiffness', 'head_trauma']);
    expect(evaluateAlarmSignals(episode({ symptoms: [{ type: 'fever' }] }), none)).toEqual([]);
  });

  it('embarazo o posparto con intensidad 7 o más', () => {
    expect(evaluateAlarmSignals(episode({ maxIntensity: 6 }), { ...none, pregnantOrPostpartum: true })).toEqual([]);
    expect(evaluateAlarmSignals(episode({ maxIntensity: 7 }), { ...none, pregnantOrPostpartum: true })).toEqual(['pregnancy']);
  });

  it('cambio marcado de patrón: necesita 5 episodios previos en 90 días', () => {
    expect(isPatternChange(episode({ maxIntensity: 9 }), history(4))).toBe(false);
    expect(isPatternChange(episode({ maxIntensity: 8 }), history(5))).toBe(true);
    expect(isPatternChange(episode({ maxIntensity: 7 }), history(5))).toBe(false);
    // Duración: el doble del promedio y al menos 6 h más.
    expect(isPatternChange(episode({ durationMin: 600 }), history(5))).toBe(true);
    expect(isPatternChange(episode({ durationMin: 470 }), history(5))).toBe(false);
    // Los episodios de hace más de 90 días no cuentan.
    const old = history(5).map((h) => ({ ...h, startedAt: '2026-05-01T10:00:00.000Z' }));
    expect(isPatternChange(episode({ maxIntensity: 10 }), old)).toBe(false);
  });

  it('número de emergencias según el país del perfil', () => {
    expect(emergencyNumber()).toBe('112');
    expect(emergencyNumber('España')).toBe('112');
    expect(emergencyNumber('México')).toBe('911');
    expect(emergencyNumber('Chile')).toBe('131');
  });
});
