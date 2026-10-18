/**
 * Aplica un plan de importación sobre los repositorios locales sin pisar lo escrito a mano.
 * Volver a importar actualiza lo que ya vino del teléfono.
 */
import type { Repositories } from '../../data/repositories';
import type { ImportPlan } from '../../domain/healthImport';
import { clock } from '../../utils/clock';

export interface ImportSummary {
  profile: string[];
  sleepNights: number;
  hydrationDays: number;
  menstruationDays: number;
  /** Días que no se tocaron porque ya tenían un registro escrito a mano. */
  skippedManual: number;
}

export async function applyImport(repos: Repositories, userId: string, plan: ImportPlan): Promise<ImportSummary> {
  const summary: ImportSummary = { profile: [], sleepNights: 0, hydrationDays: 0, menstruationDays: 0, skippedManual: 0 };

  if (plan.weightKg !== undefined || plan.heightCm !== undefined) {
    const profile = await repos.account.getProfile(userId);
    if (profile) {
      await repos.account.updateProfile(userId, {
        ...profile,
        weightKg: plan.weightKg ?? profile.weightKg,
        heightCm: plan.heightCm ?? profile.heightCm,
      });
      if (plan.weightKg !== undefined) summary.profile.push('peso');
      if (plan.heightCm !== undefined) summary.profile.push('altura');
    }
  }

  for (const night of plan.sleep) {
    const existing = await repos.sleep.getByDate(userId, night.date);
    if (existing?.source === 'manual') {
      summary.skippedManual += 1;
      continue;
    }
    if (existing) await repos.sleep.update(userId, existing.id, night);
    else await repos.sleep.create(userId, night);
    summary.sleepNights += 1;
  }

  for (const day of plan.hydration) {
    const existing = await repos.hydration.getByDate(userId, day.date);
    if (existing?.source === 'manual') {
      summary.skippedManual += 1;
      continue;
    }
    const input = { date: day.date, amountMl: day.amountMl, goalMl: existing?.goalMl, source: 'health_connect' as const };
    if (existing) await repos.hydration.update(userId, existing.id, input);
    else await repos.hydration.create(userId, input);
    summary.hydrationDays += 1;
  }

  for (const date of plan.menstruationDays) {
    const existing = await repos.daily.getByDate(userId, date);
    if (existing?.menstruation) continue;
    await repos.daily.upsertForDay(userId, { ...(existing ?? {}), date, menstruation: true });
    summary.menstruationDays += 1;
  }

  await repos.account.markHealthImport(userId, clock.now().toISOString());
  return summary;
}
