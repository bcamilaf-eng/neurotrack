/**
 * Barra de navegación inferior: Inicio, Calendario, Registrar (botón central), Evolución y Comunidad.
 * Perfil sigue siendo una pestaña, pero se abre desde el botón de perfil de Inicio.
 */
import { Tabs } from 'expo-router';
import { NeuroTabBar, TAB_ITEMS } from '../../ui/features/navigation/TabBar';
import { useAppTheme } from '../../ui/theme/ThemeContext';

export default function TabsLayout() {
  const { colors } = useAppTheme();
  return (
    <Tabs
      tabBar={(props) => <NeuroTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
    >
      {TAB_ITEMS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
      ))}
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', href: null }} />
    </Tabs>
  );
}
