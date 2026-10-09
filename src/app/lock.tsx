/** Pantalla de bloqueo: no muestra ningún dato hasta verificar la identidad. */
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSession } from '../state/sessionStore';
import { AppText, Banner, Button, Screen } from '../ui/components';
import { BrandMark } from '../ui/features/auth/AuthHeader';
import { spacing } from '../ui/theme';

export default function LockScreen() {
  const { unlock, signOut } = useSession();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const tryUnlock = async () => {
    setBusy(true);
    const ok = await unlock().catch(() => false);
    setFailed(!ok);
    setBusy(false);
  };

  // Pide la biometría automáticamente al mostrar la pantalla.
  useEffect(() => {
    unlock()
      .then((ok) => setFailed(!ok))
      .catch(() => setFailed(true));
  }, [unlock]);

  return (
    <Screen
      scroll={false}
      footer={
        <>
          <Button label="Desbloquear" onPress={tryUnlock} loading={busy} />
          <Button label="Cerrar sesión" variant="ghost" onPress={() => signOut()} />
        </>
      }
    >
      <View style={styles.center}>
        <BrandMark size={72} />
        <AppText variant="title">NeuroTrack está bloqueado</AppText>
        <AppText muted style={styles.text}>
          Usa Face ID, tu huella o el código del dispositivo para ver tu registro.
        </AppText>
        {failed ? <Banner tone="warning" message="No se pudo verificar tu identidad. Inténtalo de nuevo." /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  text: { textAlign: 'center' },
});
