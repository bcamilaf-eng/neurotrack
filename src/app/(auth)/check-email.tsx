/** Tras el registro en la nube: pide confirmar el email. */
import { router, useLocalSearchParams } from 'expo-router';
import { AppText, Button, Screen } from '../../ui/components';
import { AuthHeader } from '../../ui/features/auth/AuthHeader';

export default function CheckEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  return (
    <Screen
      edges={['left', 'right']}
      footer={<Button label="Ir a iniciar sesión" onPress={() => router.replace('/sign-in')} />}
    >
      <AuthHeader title="Revisa tu email" />
      <AppText>
        Te enviamos un enlace de confirmación{email ? ` a ${email}` : ''}. Ábrelo desde este teléfono y después inicia
        sesión.
      </AppText>
      <AppText muted>Si no lo ves en unos minutos, revisa la carpeta de correo no deseado.</AppText>
    </Screen>
  );
}
