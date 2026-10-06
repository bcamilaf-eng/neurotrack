/**
 * Recordatorios configurables (§18). Cada uno se activa por separado y tiene su hora.
 *
 * Privacidad: la notificación nunca lleva datos clínicos; en la pantalla de bloqueo solo
 * se lee «Tienes un registro pendiente», sea cual sea el recordatorio.
 */
import { z } from 'zod';
import { HH_MM } from '../utils/time';

export const REMINDER_TITLE = 'NeuroTrack';
export const REMINDER_BODY = 'Tienes un registro pendiente';

export const REMINDER_TYPES = [
  { code: 'symptoms', label: 'Registrar síntomas', description: 'Anotar si hoy tuviste dolor o síntomas.', time: '20:00' },
  { code: 'medication', label: 'Registrar medicación', description: 'Anotar las tomas del día y cómo respondiste.', time: '21:00' },
  { code: 'daily', label: 'Registro diario', description: 'Sueño, estrés y estado del día.', time: '21:30' },
  { code: 'hydration', label: 'Hidratación', description: 'Anotar el agua que llevas hoy.', time: '13:00' },
  { code: 'followup', label: 'Seguimiento semanal', description: 'Revisar tu evolución una vez por semana.', time: '19:00', weekly: true },
] as const;
export type ReminderType = (typeof REMINDER_TYPES)[number]['code'];

export const WEEKDAYS = [
  { code: '2', label: 'Lunes' },
  { code: '3', label: 'Martes' },
  { code: '4', label: 'Miércoles' },
  { code: '5', label: 'Jueves' },
  { code: '6', label: 'Viernes' },
  { code: '7', label: 'Sábado' },
  { code: '1', label: 'Domingo' },
] as const;

const reminderSchema = z.object({
  enabled: z.boolean(),
  time: z.string().regex(HH_MM, 'Elige una hora válida.'),
  /** Solo seguimiento semanal: 1 = domingo … 7 = sábado (convención de las notificaciones). */
  weekday: z.number().int().min(1).max(7).optional(),
});
export type ReminderSetting = z.infer<typeof reminderSchema>;
export type ReminderSettings = Record<ReminderType, ReminderSetting>;

export function defaultReminders(): ReminderSettings {
  const out = {} as ReminderSettings;
  for (const r of REMINDER_TYPES) {
    out[r.code] = { enabled: false, time: r.time, ...('weekly' in r ? { weekday: 2 } : {}) };
  }
  return out;
}

/** Lee lo guardado en ajustes; lo que falte o no sea válido vuelve al valor por defecto. */
export function parseReminders(raw: unknown): ReminderSettings {
  const out = defaultReminders();
  if (!raw || typeof raw !== 'object') return out;
  for (const r of REMINDER_TYPES) {
    const parsed = reminderSchema.safeParse({ ...out[r.code], ...((raw as Record<string, unknown>)[r.code] as object) });
    if (parsed.success) out[r.code] = parsed.data;
  }
  return out;
}

export const anyEnabled = (settings: ReminderSettings) => REMINDER_TYPES.some((r) => settings[r.code].enabled);
