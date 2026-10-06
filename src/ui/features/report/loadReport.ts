/** Reúne los registros de un rango y construye el informe para la consulta. */
import { addDays, format, parseISO } from 'date-fns';
import { analyzePatterns } from '../../../domain/analytics/patterns';
import type { DateRange } from '../../../domain/analytics/periods';
import { sleepHours } from '../../../domain/entities/habits';
import { buildReport, type Report } from '../../../domain/report/report';
import { getRepositories } from '../../../state/services';
import { clock } from '../../../utils/clock';

export async function loadReport(userId: string, range: DateRange): Promise<Report> {
  const repos = await getRepositories();
  // Una semana antes para contar los días con dolor de episodios que empezaron antes del rango.
  const lookback = format(addDays(parseISO(range.from), -7), 'yyyy-MM-dd');
  const [episodes, medications, alarms, profile, consents, daily, sleep, hydration, meals] = await Promise.all([
    repos.episodes.listBetween(userId, lookback, range.to),
    repos.medications.listBetween(userId, range.from, range.to),
    repos.alarms.listBetween(userId, range.from, range.to),
    repos.account.getProfile(userId),
    repos.account.currentConsents(userId),
    repos.daily.listBetween(userId, range.from, range.to),
    repos.sleep.listBetween(userId, range.from, range.to),
    repos.hydration.listBetween(userId, range.from, range.to),
    repos.meals.listBetween(userId, range.from, range.to),
  ]);
  const patternsConsented = !!consents.pattern_analysis?.accepted;
  return buildReport({
    range,
    generatedAt: clock.now(),
    patientName: profile?.name,
    episodes,
    medications,
    alarms,
    patternsConsented,
    patterns: analyzePatterns({
      range,
      episodes,
      // Sin consentimiento, los hábitos no se cruzan con los episodios.
      sleep: patternsConsented ? sleep.map((s) => ({ date: s.date, hours: sleepHours(s) })) : [],
      daily: patternsConsented ? daily : [],
      hydration: patternsConsented ? hydration : [],
      meals: patternsConsented ? meals : [],
    }),
  });
}
