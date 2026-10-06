import { useState } from 'react';
import { useSession } from '../../../state/sessionStore';
import { AppText, Banner, Screen, SwitchRow } from '../../../ui/components';

export default function SecurityScreen() {
  const { settings, setBiometricLock } = useSession();
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
      <AppText variant="caption" muted>
        Tus registros están cifrados en el teléfono aunque el bloqueo esté desactivado. El bloqueo evita que alguien con
        tu teléfono desbloqueado los vea.
      </AppText>
    </Screen>
  );
}
