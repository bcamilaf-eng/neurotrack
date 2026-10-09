import { Stack } from 'expo-router';
import { useAppTheme } from '../../ui/theme/ThemeContext';

export default function EpisodeLayout() {
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
      <Stack.Screen name="nuevo" options={{ title: 'Nuevo episodio', presentation: 'modal' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Episodio' }} />
      <Stack.Screen name="[id]/editar" options={{ title: 'Editar episodio' }} />
    </Stack>
  );
}
