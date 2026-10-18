import { Stack } from 'expo-router';
import { useAppTheme } from '../../ui/theme/ThemeContext';

/** Tema con sus respuestas y formulario de nuevo tema, abiertos desde la pestaña Comunidad. */
export default function CommunityLayout() {
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
      <Stack.Screen name="[id]" options={{ title: 'Tema' }} />
      <Stack.Screen name="nuevo" options={{ title: 'Nuevo tema', presentation: 'modal' }} />
    </Stack>
  );
}
