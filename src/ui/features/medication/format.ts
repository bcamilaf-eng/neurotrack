import { DOSE_UNITS, labelOf, MEDICATION_RESPONSES } from '../../../domain/catalogs';
import type { MedicationData } from '../../../domain/entities/medication';

/** «Ibuprofeno 400 mg». */
export function medicationSummary(m: Pick<MedicationData, 'name' | 'doseValue' | 'doseUnit'>): string {
  return `${m.name} ${String(m.doseValue).replace('.', ',')} ${labelOf(DOSE_UNITS, m.doseUnit)}`;
}

/** «Alivio parcial en 45 min» o «Respuesta sin registrar». */
export function responseSummary(m: Pick<MedicationData, 'response' | 'minutesToRelief'>): string {
  if (!m.response) return 'Respuesta sin registrar';
  const label = labelOf(MEDICATION_RESPONSES, m.response);
  return m.minutesToRelief !== undefined ? `${label} en ${m.minutesToRelief} min` : label;
}
