/** Convierte texto de un campo numérico («60,5», « 72 ») en número; vacío → `undefined`. */
export function parseOptionalNumber(text: string): number | undefined {
  const trimmed = text.trim().replace(',', '.');
  if (!trimmed) return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : Number.NaN;
}

export function optionalString(text: string): string | undefined {
  const trimmed = text.trim();
  return trimmed ? trimmed : undefined;
}
