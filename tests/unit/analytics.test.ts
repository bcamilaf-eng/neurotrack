import {
  daysSinceLast,
  episodeDays,
  type EpisodeLike,
  summarize,
  weeklyBuckets,
} from '../../src/domain/analytics/summary';

const NOW = new Date('2026-10-14T12:00:00Z'); // miércoles

function ep(startedAt: string, endedAt: string | null, maxIntensity: number): EpisodeLike {
  const durationMin = endedAt ? (Date.parse(endedAt) - Date.parse(startedAt)) / 60000 : null;
  return {
    date: startedAt.slice(0, 10),
    startedAt,
    endedAt,
    ongoing: endedAt === null,
    intensity: maxIntensity,
    maxIntensity,
    durationMin,
  };
}

const EPISODES = [
  ep('2026-10-01T08:00:00Z', '2026-10-01T12:00:00Z', 6), // 4 h
  ep('2026-10-01T20:00:00Z', '2026-10-01T22:00:00Z', 4), // mismo día, 2 h
  ep('2026-10-05T22:00:00Z', '2026-10-06T04:00:00Z', 8), // cruza medianoche, 6 h
  ep('2026-09-28T10:00:00Z', '2026-09-28T11:00:00Z', 9), // mes anterior
];

describe('resumen del período', () => {
  it('calcula episodios, días con dolor, intensidad y duración promedio', () => {
    expect(summarize(EPISODES, '2026-10-01', '2026-10-31', NOW)).toEqual({
      episodes: 3,
      painDays: 3, // 1, 5 y 6 de octubre
      avgIntensity: 6,
      avgDurationMin: 240,
    });
  });

  it('devuelve promedios nulos sin datos', () => {
    expect(summarize([], '2026-10-01', '2026-10-31', NOW)).toEqual({
      episodes: 0,
      painDays: 0,
      avgIntensity: null,
      avgDurationMin: null,
    });
  });

  it('excluye de la duración los episodios en curso', () => {
    const list = [...EPISODES, ep('2026-10-14T09:00:00Z', null, 7)];
    const s = summarize(list, '2026-10-01', '2026-10-31', NOW);
    expect(s.episodes).toBe(4);
    expect(s.avgDurationMin).toBe(240);
    expect(s.painDays).toBe(4);
  });
});

describe('días del episodio', () => {
  it('incluye todos los días que abarca', () => {
    expect(episodeDays(EPISODES[2], NOW)).toEqual(['2026-10-05', '2026-10-06']);
  });
});

describe('días desde el último episodio', () => {
  it('cuenta días completos desde el fin, y 0 si sigue en curso', () => {
    expect(daysSinceLast(EPISODES[2], NOW)).toBe(8);
    expect(daysSinceLast(ep('2026-10-14T09:00:00Z', null, 5), NOW)).toBe(0);
    expect(daysSinceLast(null, NOW)).toBeNull();
  });
});

describe('semanas', () => {
  it('agrupa de lunes a domingo, de la más antigua a la actual', () => {
    const weeks = weeklyBuckets(EPISODES, 3, NOW);
    expect(weeks.map((w) => w.weekStart)).toEqual(['2026-09-28', '2026-10-05', '2026-10-12']);
    expect(weeks.map((w) => w.episodes)).toEqual([3, 1, 0]);
    expect(weeks[0].avgIntensity).toBe(6.3);
    expect(weeks[2].avgIntensity).toBeNull();
  });
});
