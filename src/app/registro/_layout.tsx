import { Stack } from 'expo-router';
import { useAppTheme } from '../../ui/theme/ThemeContext';

/** Formularios de tratamiento y hábitos que se abren desde Registrar, Inicio o un episodio. */
export default function RecordLayout() {
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
      <Stack.Screen name="medicacion/index" options={{ title: 'Medicación' }} />
      <Stack.Screen name="medicacion/nueva" options={{ title: 'Registrar medicación', presentation: 'modal' }} />
      <Stack.Screen name="medicacion/[id]" options={{ title: 'Editar toma' }} />
      <Stack.Screen name="sueno" options={{ title: 'Sueño' }} />
      <Stack.Screen name="hidratacion" options={{ title: 'Hidratación' }} />
      <Stack.Screen name="alimentacion/index" options={{ title: 'Alimentación' }} />
      <Stack.Screen name="alimentacion/nueva" options={{ title: 'Nueva comida', presentation: 'modal' }} />
      <Stack.Screen name="alimentacion/[id]" options={{ title: 'Editar comida' }} />
      <Stack.Screen name="estado" options={{ title: 'Estado del día' }} />
    </Stack>
  );
}
