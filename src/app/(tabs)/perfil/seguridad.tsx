import { useState } from 'react';
import { useSession } from '../../../state/sessionStore';
import { AppText, Banner, OptionGroup, Screen, SwitchRow } from '../../../ui/components';

const LOCK_AFTER = [
  { code: '0', label: 'Al instante' },
  { code: '1', label: '1 minuto' },
  { code: '5', label: '5 minutos' },
  { code: '15', label: '15 minutos' },
] as const;

export default function SecurityScreen() {
  const { settings, setBiometricLock, updatePreferences } = useSession();
  const lockAfter = LOCK_AFTER.find((o) => Number(o.code) === settings?.lockAfterMinutes)?.code ?? '5';
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = async (enabled: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await setBiometricLock(enabled);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar el bloqueo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['left', 'right']}>
      {error ? <Banner tone="warning" message={error} /> : null}
      <SwitchRow
        label="Bloquear con Face ID, huella o código"
        description={`Se pide al abrir la app y tras ${settings?.lockAfterMinutes ?? 5} minutos en segundo plano.`}
        value={!!settings?.biometricLock}
        onChange={toggle}
        disabled={busy}
      />
      {settings?.biometricLock ? (
        <OptionGroup
          label="Pedir desbloqueo tras estar en segundo plano"
          options={LOCK_AFTER}
          value={lockAfter}
          onChange={(v) => v && updatePreferences({ lockAfterMinutes: Number(v) }).catch(() => setError('No se pudo guardar el cambio.'))}
        />
      ) : null}
      <AppText variant="caption" muted>
        Tus registros están cifrados en el teléfono aunque el bloqueo esté desactivado. El bloqueo evita que alguien con
        tu teléfono desbloqueado los vea.
      </AppText>
    </Screen>
  );
}
