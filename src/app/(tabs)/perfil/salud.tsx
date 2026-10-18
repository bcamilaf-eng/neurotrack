/**
 * Conexión con Health Connect (Android): permiso de solo lectura e importación de peso, altura,
 * sueño, hidratación y ciclo menstrual de los últimos 90 días. Nada se pisa si se escribió a mano.
 */
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { planImport } from '../../../domain/healthImport';
import { getRepositories } from '../../../state/services';
import { useSession } from '../../../state/sessionStore';
import { AppText, Banner, Button, Card, Screen, useToast } from '../../../ui/components';
import { clock } from '../../../utils/clock';
import {
  getStatus,
  grantedTypes,
  type HealthStatus,
  IMPORT_DAYS,
  openSettings,
  readSnapshot,
  requestAccess,
} from '../../../services/health/healthConnect';
import { applyImport, type ImportSummary } from '../../../services/health/importer';

const LABELS: Record<string, string> = {
  Weight: 'Peso',
  Height: 'Altura',
  SleepSession: 'Sueño',
  Hydration: 'Hidratación',
  MenstruationFlow: 'Menstruación',
  MenstruationPeriod: 'Períodos menstruales',
};

function describe(summary: ImportSummary): string {
  const parts: string[] = [];
  if (summary.profile.length) parts.push(`${summary.profile.join(' y ')} actualizados`);
  if (summary.sleepNights) parts.push(`${summary.sleepNights} noches de sueño`);
  if (summary.hydrationDays) parts.push(`${summary.hydrationDays} días de hidratación`);
  if (summary.menstruationDays) parts.push(`${summary.menstruationDays} días de menstruación`);
  const text = parts.length ? `Importado: ${parts.join(', ')}.` : 'No había datos nuevos para importar.';
  return summary.skippedManual
    ? `${text} ${summary.skippedManual} días no se tocaron porque ya los habías anotado tú.`
    : text;
}

export default function HealthScreen() {
  const user = useSession((s) => s.user);
  const toast = useToast();
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [granted, setGranted] = useState<string[]>([]);
  const [lastImport, setLastImport] = useState<string | null>(null);
  const [busy, setBusy] = useState<'connect' | 'import' | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const next = await getStatus();
      setStatus(next);
      if (next === 'available') setGranted(await grantedTypes());
      const repos = await getRepositories();
      setLastImport(await repos.account.getHealthImport(user.id));
    } catch {
      setStatus('unsupported');
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const connect = async () => {
    setBusy('connect');
    setError(null);
    try {
      setGranted(await requestAccess());
    } catch {
      setError('No se pudo abrir Health Connect. Inténtalo de nuevo.');
    } finally {
      setBusy(null);
    }
  };

  const importNow = async () => {
    if (!user) return;
    setBusy('import');
    setError(null);
    try {
      const repos = await getRepositories();
      const summary = await applyImport(repos, user.id, planImport(await readSnapshot(clock.now()), 'health_connect'));
      setResult(describe(summary));
      setLastImport(clock.now().toISOString());
      toast.show('Datos importados');
    } catch {
      setError('No se pudieron leer los datos de Health Connect. Revisa los permisos e inténtalo de nuevo.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen edges={['left', 'right']}>
      <AppText muted>
        Trae a NeuroTrack datos que ya registran otras apps o tu reloj (Samsung Health, Google Fit, Fitbit…). Solo se
        leen; NeuroTrack no escribe nada en Health Connect.
      </AppText>
      <Card>
        <AppText variant="heading">Qué se importa</AppText>
        <AppText variant="caption">• Peso y altura, para tu perfil.</AppText>
        <AppText variant="caption">• Horas de sueño de cada noche (la calidad la anotas tú si quieres).</AppText>
        <AppText variant="caption">• Agua tomada cada día.</AppText>
        <AppText variant="caption">• Días de menstruación, útiles para la migraña menstrual.</AppText>
        <AppText variant="caption" muted>
          Se leen los últimos {IMPORT_DAYS} días. Lo que hayas anotado a mano en NeuroTrack no se reemplaza.
        </AppText>
      </Card>

      {status === 'unsupported' ? (
        <Banner tone="info" message="La conexión con datos de salud está disponible en Android con Health Connect. En iPhone llegará con Apple Salud." />
      ) : null}
      {status === 'not_installed' ? (
        <Banner tone="warning" message="Este teléfono no tiene Health Connect. Instálalo desde Google Play y vuelve a esta pantalla." />
      ) : null}
      {status === 'update_required' ? (
        <Banner tone="warning" message="Health Connect necesita actualizarse desde Google Play antes de conectarlo." />
      ) : null}
      {error ? <Banner tone="danger" message={error} /> : null}
      {result ? <Banner tone="info" message={result} /> : null}

      {status === 'available' ? (
        <>
          <Card>
            <AppText variant="label">{granted.length ? 'Permisos concedidos' : 'Aún sin permisos'}</AppText>
            <AppText variant="caption" muted>
              {granted.length ? [...new Set(granted.map((g) => LABELS[g] ?? g))].join(', ') : 'Elige qué datos puede leer NeuroTrack.'}
            </AppText>
            {lastImport ? (
              <AppText variant="caption" muted>
                Última importación: {format(parseISO(lastImport), "d 'de' MMMM, HH:mm", { locale: es })}
              </AppText>
            ) : null}
          </Card>
          <Button
            label={granted.length ? 'Cambiar permisos' : 'Conectar con Health Connect'}
            variant={granted.length ? 'secondary' : 'primary'}
            icon="link"
            onPress={connect}
            loading={busy === 'connect'}
            testID="health-connect"
          />
          {granted.length ? (
            <Button label="Importar ahora" icon="download-outline" onPress={importNow} loading={busy === 'import'} testID="health-import" />
          ) : null}
          <Button label="Abrir ajustes de Health Connect" variant="ghost" onPress={openSettings} />
        </>
      ) : null}
    </Screen>
  );
}
