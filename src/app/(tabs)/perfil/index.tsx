import { router } from 'expo-router';
import { View } from 'react-native';
import { useSession } from '../../../state/sessionStore';
import { AppText, Button, Card, ListRow, Screen } from '../../../ui/components';

export default function ProfileHome() {
  const { user, mode, signOut, settings } = useSession();
  return (
    <Screen>
      <AppText variant="title">Perfil</AppText>
      <Card>
        <AppText variant="label">{user?.email}</AppText>
        <AppText variant="caption" muted>
          {mode === 'cloud' ? 'Cuenta en la nube' : 'Cuenta local de prueba (solo en este teléfono)'}
        </AppText>
      </Card>
      <View>
        <ListRow title="Datos personales" subtitle="Opcionales, y contacto de emergencia" onPress={() => router.push('/perfil/datos')} />
        <ListRow
          title="Seguridad"
          subtitle="Bloqueo con Face ID, huella o código"
          value={settings?.biometricLock ? 'Activado' : 'Desactivado'}
          onPress={() => router.push('/perfil/seguridad')}
        />
        <ListRow title="Privacidad" subtitle="Consentimientos y eliminación de datos" onPress={() => router.push('/perfil/privacidad')} />
        <ListRow title="Acerca de" subtitle="Versión, términos y aviso médico" onPress={() => router.push('/perfil/acerca')} />
      </View>
      <Button label="Cerrar sesión" variant="secondary" onPress={() => signOut()} />
    </Screen>
  );
}
