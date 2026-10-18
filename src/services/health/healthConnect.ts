/**
 * Lectura de Health Connect (Android). Solo lectura y solo de los tipos que la persona autoriza.
 * En iOS y en las pruebas no hay módulo nativo: `isSupported()` devuelve `false`.
 */
import { Platform } from 'react-native';
import type { HealthSnapshot } from '../../domain/healthImport';

export const HEALTH_RECORD_TYPES = ['Weight', 'Height', 'SleepSession', 'Hydration', 'MenstruationFlow', 'MenstruationPeriod'] as const;
type HealthRecordType = (typeof HEALTH_RECORD_TYPES)[number];

export type HealthStatus = 'unsupported' | 'not_installed' | 'update_required' | 'available';

/** Días hacia atrás que se leen en cada importación. */
export const IMPORT_DAYS = 90;

// Se carga bajo demanda para que la app (y las pruebas) funcionen donde no existe el módulo nativo.
function native(): typeof import('react-native-health-connect') | null {
  if (Platform.OS !== 'android') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-health-connect');
  } catch {
    return null;
  }
}

export function isSupported(): boolean {
  return native() !== null;
}

export async function getStatus(): Promise<HealthStatus> {
  const hc = native();
  if (!hc) return 'unsupported';
  const status = await hc.getSdkStatus();
  if (status === hc.SdkAvailabilityStatus.SDK_AVAILABLE) return 'available';
  if (status === hc.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'update_required';
  return 'not_installed';
}

/** Pide permiso de lectura y devuelve los tipos concedidos. */
export async function requestAccess(): Promise<HealthRecordType[]> {
  const hc = native();
  if (!hc) return [];
  await hc.initialize();
  const granted = await hc.requestPermission(HEALTH_RECORD_TYPES.map((recordType) => ({ accessType: 'read' as const, recordType })));
  return granted.filter((p) => p.accessType === 'read').map((p) => p.recordType as HealthRecordType);
}

export async function grantedTypes(): Promise<HealthRecordType[]> {
  const hc = native();
  if (!hc) return [];
  await hc.initialize();
  const granted = await hc.getGrantedPermissions();
  return granted.filter((p) => p.accessType === 'read').map((p) => p.recordType as HealthRecordType);
}

export function openSettings(): void {
  native()?.openHealthConnectSettings();
}

async function readAll<T extends HealthRecordType>(type: T, startTime: string, endTime: string) {
  const hc = native()!;
  const records: unknown[] = [];
  let pageToken: string | undefined;
  do {
    const result = await hc.readRecords(type, {
      timeRangeFilter: { operator: 'between', startTime, endTime },
      pageToken,
    });
    records.push(...result.records);
    pageToken = result.pageToken || undefined;
  } while (pageToken);
  return records as Record<string, unknown>[];
}

/** Lee los últimos `IMPORT_DAYS` días de los tipos concedidos. */
export async function readSnapshot(now: Date): Promise<HealthSnapshot> {
  const granted = new Set(await grantedTypes());
  const endTime = now.toISOString();
  const startTime = new Date(now.getTime() - IMPORT_DAYS * 86_400_000).toISOString();
  const read = (type: HealthRecordType) => (granted.has(type) ? readAll(type, startTime, endTime) : Promise.resolve([]));

  const [weight, height, sleep, hydration, flow, periods] = await Promise.all(HEALTH_RECORD_TYPES.map(read));
  const str = (v: unknown) => String(v);
  const num = (v: unknown) => Number(v);
  return {
    weight: weight.map((r) => ({ time: str(r.time), value: num((r.weight as { inKilograms: number }).inKilograms) })),
    height: height.map((r) => ({ time: str(r.time), value: num((r.height as { inMeters: number }).inMeters) })),
    sleep: sleep.map((r) => ({ startTime: str(r.startTime), endTime: str(r.endTime) })),
    hydration: hydration.map((r) => ({
      startTime: str(r.startTime),
      endTime: str(r.endTime),
      volumeMl: num((r.volume as { inMilliliters: number }).inMilliliters),
    })),
    menstruationFlow: flow.map((r) => ({ time: str(r.time) })),
    menstruationPeriods: periods
      .filter((r) => r.startTime && r.endTime)
      .map((r) => ({ startTime: str(r.startTime), endTime: str(r.endTime) })),
  };
}
