import { Stack } from 'expo-router';
import { useAppTheme } from '../../../ui/theme/ThemeContext';

export default function ProfileLayout() {
  const { colors } = useAppTheme();
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        headerStyle: { backgroundColor: colors.background },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="datos" options={{ title: 'Datos personales' }} />
      <Stack.Screen name="seguridad" options={{ title: 'Seguridad' }} />
      <Stack.Screen name="recordatorios" options={{ title: 'Recordatorios' }} />
      <Stack.Screen name="apariencia" options={{ title: 'Apariencia' }} />
      <Stack.Screen name="politica" options={{ title: 'Política de privacidad' }} />
      <Stack.Screen name="terminos" options={{ title: 'Términos de uso' }} />
      <Stack.Screen name="privacidad" options={{ title: 'Privacidad' }} />
      <Stack.Screen name="acerca" options={{ title: 'Acerca de' }} />
    </Stack>
  );
}
