import { router } from 'expo-router';
import { View } from 'react-native';
import { parseReminders, REMINDER_TYPES } from '../../../domain/reminders';
import { useSession } from '../../../state/sessionStore';
import { AppText, Button, Card, ListRow, Screen } from '../../../ui/components';

export default function ProfileHome() {
  const { user, mode, signOut, settings } = useSession();
  const reminders = parseReminders(settings?.reminders);
  const activeReminders = REMINDER_TYPES.filter((r) => reminders[r.code].enabled).length;
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
        <ListRow
          title="Recordatorios"
          subtitle="Síntomas, medicación, registro diario, hidratación y seguimiento"
          value={`${activeReminders} activos`}
          onPress={() => router.push('/perfil/recordatorios')}
        />
        <ListRow
          title="Apariencia"
          subtitle="Tema claro u oscuro y tamaño del texto"
          onPress={() => router.push('/perfil/apariencia')}
        />
        <ListRow title="Privacidad" subtitle="Consentimientos, exportar y eliminar tus datos" onPress={() => router.push('/perfil/privacidad')} />
        <ListRow title="Acerca de" subtitle="Versión, términos y aviso médico" onPress={() => router.push('/perfil/acerca')} />
      </View>
      <Button label="Cerrar sesión" variant="secondary" onPress={() => signOut()} />
    </Screen>
  );
}
