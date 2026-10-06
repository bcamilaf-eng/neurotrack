/**
 * Utilidades de fecha y hora.
 *
 * Convención de almacenamiento:
 * - Instantes (inicio/fin de episodio, hora de una toma) → ISO 8601 en UTC
 *   (`2026-10-06T17:00:00.000Z`), para que las duraciones sean exactas aunque el
 *   usuario viaje o cambie el horario de verano.
 * - Días de calendario (`fecha`) → `YYYY-MM-DD` en la hora local del usuario en el
 *   momento del registro, que es lo que ve en el calendario.
 */
import { differenceInMinutes, format, isValid, parse, parseISO } from 'date-fns';

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = parse(value, 'yyyy-MM-dd', new Date());
  return isValid(parsed) && format(parsed, 'yyyy-MM-dd') === value;
}

export function isIsoInstant(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) && isValid(parseISO(value));
}

export function toLocalDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function today(now: Date = new Date()): string {
  return toLocalDate(now);
}

/** Combina un día local `YYYY-MM-DD` y una hora `HH:mm` en un `Date` local. */
export function combineDateAndTime(date: string, time: string): Date {
  if (!isIsoDate(date)) throw new RangeError(`Fecha inválida: ${date}`);
  if (!HH_MM.test(time)) throw new RangeError(`Hora inválida: ${time}`);
  return parse(`${date} ${time}`, 'yyyy-MM-dd HH:mm', new Date());
}

/**
 * Resuelve la hora de término de un episodio que puede cruzar la medianoche:
 * si la hora de fin es anterior o igual a la de inicio, se interpreta como el día siguiente.
 */
export function resolveEnd(start: Date, endTime: string): Date {
  const end = combineDateAndTime(toLocalDate(start), endTime);
  if (end.getTime() <= start.getTime()) end.setDate(end.getDate() + 1);
  return end;
}

export function minutesBetween(startIso: string, endIso: string): number {
  return differenceInMinutes(parseISO(endIso), parseISO(startIso));
}

/** `135` → `"2 h 15 min"`. */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return '—';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = Math.round(minutes % 60);
  const parts: string[] = [];
  if (days) parts.push(`${days} d`);
  if (hours) parts.push(`${hours} h`);
  if (mins || parts.length === 0) parts.push(`${mins} min`);
  return parts.join(' ');
}

/** Edad en años cumplidos a partir de `YYYY-MM-DD`. */
export function ageFromBirthDate(birthDate: string, now: Date = new Date()): number {
  const birth = parse(birthDate, 'yyyy-MM-dd', now);
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}
