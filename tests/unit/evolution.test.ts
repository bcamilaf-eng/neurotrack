import { addDays, format, parseISO } from 'date-fns';
import { dayCategory, leadingBlanks, monthMarks } from '../../src/domain/analytics/calendar';
import { analyzePatterns, PATTERN_RULES, type PatternInput } from '../../src/domain/analytics/patterns';
import { periodBuckets, periodRange } from '../../src/domain/analytics/periods';
import { evolutionStats, medicationStats } from '../../src/domain/analytics/stats';
import type { EpisodeLike } from '../../src/domain/analytics/summary';
import type { EpisodeType } from '../../src/domain/catalogs';

const NOW = new Date('2026-10-06T12:00:00Z');

function episode(startedAt: string, hours: number | null, maxIntensity: number, type: EpisodeType = 'migraine'): EpisodeLike & { type: EpisodeType } {
  const start = parseISO(startedAt);
  const end = hours === null ? null : new Date(start.getTime() + hours * 3600_000).toISOString();
  return {
    date: startedAt.slice(0, 10),
    startedAt,
    endedAt: end,
    ongoing: hours === null,
    intensity: maxIntensity,
    maxIntensity,
    durationMin: hours === null ? null : hours * 60,
    type,
  };
}

const day = (offset: number) => format(addDays(parseISO('2026-10-06'), offset), 'yyyy-MM-dd');

describe('períodos', () => {
  it('calculan el rango hacia atrás desde hoy', () => {
    expect(periodRange('7d', NOW)).toEqual({ from: '2026-09-30', to: '2026-10-06' });
    expect(periodRange('30d', NOW)).toEqual({ from: '2026-09-07', to: '2026-10-06' });
    expect(periodRange('3m', NOW)).toEqual({ from: '2026-07-07', to: '2026-10-06' });
    expect(periodRange('12m', NOW)).toEqual({ from: '2025-10-07', to: '2026-10-06' });
  });

  it('dividen en días, semanas o meses sin huecos', () => {
    expect(periodBuckets('7d', periodRange('7d', NOW))).toHaveLength(7);
    const weeks = periodBuckets('30d', periodRange('30d', NOW));
    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toMatchObject({ from: '2026-09-07', to: '2026-09-08' });
    expect(weeks.at(-1)).toMatchObject({ from: '2026-09-30', to: '2026-10-06' });
    const months = periodBuckets('6m', periodRange('6m', NOW));
    expect(months.map((m) => m.label)).toEqual(['abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct']);
    expect(months[0].from).toBe('2026-04-07');
  });
});

describe('estadísticas del período', () => {
  it('cuentan días con y sin dolor, distribución de intensidad y tramos', () => {
    const episodes = [
      episode('2026-10-01T22:00:00.000Z', 4, 8), // cruza la medianoche: 2 días con dolor
      episode('2026-10-04T10:00:00.000Z', 2, 3, 'tension'),
      episode('2026-09-20T10:00:00.000Z', 2, 10),
    ];
    const range = periodRange('7d', NOW);
    const stats = evolutionStats(
      { episodes, medications: [], painFreeDates: ['2026-10-03', '2026-10-04'] },
      range,
      periodBuckets('7d', range),
      NOW,
    );
    expect(stats).toMatchObject({ episodes: 2, painDays: 3, days: 7, daysWithoutPain: 4, markedPainFree: 1, avgIntensity: 5.5 });
    expect(stats.intensityDistribution.map((b) => b.count)).toEqual([1, 0, 1, 0]);
    expect(stats.buckets.map((b) => b.episodes)).toEqual([0, 1, 0, 0, 1, 0, 0]);
    expect(stats.dailyIntensity.find((d) => d.date === '2026-10-02')?.intensity).toBe(8);
  });

  it('resumen la medicación y su respuesta sin distinguir mayúsculas', () => {
    const stats = medicationStats(
      [
        { date: '2026-10-01', name: 'Ibuprofeno', response: 'complete', minutesToRelief: 30 },
        { date: '2026-10-01', name: 'ibuprofeno ', response: 'none', minutesToRelief: undefined },
        { date: '2026-10-03', name: 'Paracetamol', response: 'partial', minutesToRelief: 60 },
        { date: '2026-10-04', name: 'Paracetamol' },
        { date: '2026-08-01', name: 'Fuera' },
      ],
      { from: '2026-09-30', to: '2026-10-06' },
    );
    expect(stats).toMatchObject({ doses: 4, daysWithMedication: 3, withResponse: 3, avgMinutesToRelief: 45 });
    expect(stats.responses).toEqual({ none: 1, partial: 1, complete: 1 });
    expect(stats.byName).toEqual([
      { name: 'Ibuprofeno', doses: 2, withResponse: 2, relief: 1 },
      { name: 'Paracetamol', doses: 2, withResponse: 1, relief: 1 },
    ]);
  });
});

describe('calendario', () => {
  it('marca cada día según lo registrado', () => {
    expect(dayCategory([], false)).toBe('none');
    expect(dayCategory([], true)).toBe('painFree');
    expect(dayCategory([episode('2026-10-01T10:00:00.000Z', 1, 5, 'tension')], false)).toBe('headache');
    expect(dayCategory([episode('2026-10-01T10:00:00.000Z', 1, 5, 'jaqueca')], false)).toBe('migraine');
    expect(dayCategory([episode('2026-10-01T10:00:00.000Z', 1, 7, 'tension')], false)).toBe('intense');
  });

  it('extiende los episodios largos y señala la medicación', () => {
    const marks = monthMarks(
      NOW,
      {
        episodes: [episode('2026-09-30T20:00:00.000Z', 30, 6, 'tension'), episode('2026-10-06T08:00:00.000Z', null, 4)],
        medicationDates: ['2026-10-01'],
        painFreeDates: ['2026-10-03'],
      },
      NOW,
    );
    expect(marks).toHaveLength(31);
    expect(marks[0]).toMatchObject({ date: '2026-10-01', category: 'headache', medication: true, maxIntensity: 6 });
    expect(marks[1].category).toBe('headache');
    expect(marks[2].category).toBe('painFree');
    expect(marks[5].category).toBe('migraine');
    expect(marks[6].category).toBe('none');
    expect(leadingBlanks(NOW)).toBe(3); // 1 de octubre de 2026 es jueves
  });
});

describe('patrones personales', () => {
  const range = { from: day(-59), to: day(0) };
  const base = (): PatternInput => ({ range, episodes: [], sleep: [], daily: [], hydration: [], meals: [] });

  it('sin episodios suficientes solo muestra datos registrados', () => {
    const input = base();
    input.episodes = [{ date: day(-1), triggers: [{ type: 'stress' }, { type: 'stress' }] }];
    const result = analyzePatterns(input);
    expect(result.enoughData).toBe(false);
    expect(result.insights.map((i) => i.kind)).toEqual(['recorded', 'recorded']);
    expect(result.insights[1].text).toBe('«Estrés» en 1 de 1 episodios.');
  });

  it('describe la asociación con sueño corto con sus números, sin hablar de causas', () => {
    const input = base();
    // 20 noches: 5 cortas (4 con episodio al día siguiente) y 15 normales (4 con episodio).
    for (let i = 0; i < 20; i += 1) {
      const date = day(-i);
      const short = i < 5;
      input.sleep.push({ date, hours: short ? 5 : 7.5 });
      if ((short && i < 4) || (!short && i < 9)) input.episodes.push({ date, triggers: [] });
    }
    const result = analyzePatterns(input);
    expect(result.enoughData).toBe(true);
    const sleep = result.insights.find((i) => i.id === 'sleep')!;
    expect(sleep.kind).toBe('association');
    expect(sleep.text).toBe(
      'Los episodios registrados aparecen con mayor frecuencia después de noches con menos de 6 h de sueño: 80 % de esos días (4 de 5), frente al 27 % (4 de 15) en el resto.',
    );
    for (const insight of result.insights) expect(insight.text).not.toMatch(/caus|diagn/i);
  });

  it('no compara un factor con pocos días registrados', () => {
    const input = base();
    for (let i = 0; i < PATTERN_RULES.minEpisodes; i += 1) input.episodes.push({ date: day(-i), triggers: [] });
    for (let i = 0; i < PATTERN_RULES.minFactorDays - 1; i += 1) input.daily.push({ date: day(-i), stress: i % 2 ? 8 : 2 });
    expect(analyzePatterns(input).insights.find((i) => i.id === 'stress')).toBeUndefined();
    input.daily.push({ date: day(-30), stress: 3 });
    expect(analyzePatterns(input).insights.find((i) => i.id === 'stress')?.kind).toBe('association');
  });

  it('dice que no hay diferencia clara cuando no la hay', () => {
    const input = base();
    for (let i = 0; i < 20; i += 1) {
      input.hydration.push({ date: day(-i), amountMl: i % 2 ? 500 : 2000, goalMl: 2000 });
      if (i < 10) input.episodes.push({ date: day(-i), triggers: [] });
    }
    const hydration = analyzePatterns(input).insights.find((i) => i.id === 'hydration')!;
    expect(hydration.kind).toBe('recorded');
    expect(hydration.text).toMatch(/^No se observa una diferencia clara/);
  });

  it('detecta posibles asociaciones con alimentos anotados', () => {
    const input = base();
    for (let i = 0; i < 20; i += 1) {
      const chocolate = i < 5;
      input.meals.push({ date: day(-i), fasting: false, foods: chocolate ? ['Chocolate', 'Pan'] : ['Pan'] });
      if (i < 4 || (i >= 10 && i < 14)) input.episodes.push({ date: day(-i), triggers: [] });
    }
    const food = analyzePatterns(input).insights.filter((i) => i.id.startsWith('food-'));
    expect(food.map((i) => i.title)).toEqual(['Posible asociación detectada']);
    expect(food[0].text).toMatch(/«Chocolate» se registraron episodios el 80 % de las veces \(4 de 5\), frente al 27 % \(4 de 15\)/);
  });
});
