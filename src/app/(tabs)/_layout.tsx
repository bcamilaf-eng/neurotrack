/** Barra de navegación inferior: Inicio, Registrar, Calendario, Evolución y Perfil. */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { useAppTheme } from '../../ui/theme/ThemeContext';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', title: 'Inicio', icon: 'home-outline', iconActive: 'home' },
  { name: 'registrar', title: 'Registrar', icon: 'add-circle-outline', iconActive: 'add-circle' },
  { name: 'calendario', title: 'Calendario', icon: 'calendar-outline', iconActive: 'calendar' },
  { name: 'evolucion', title: 'Evolución', icon: 'stats-chart-outline', iconActive: 'stats-chart' },
  { name: 'perfil', title: 'Perfil', icon: 'person-circle-outline', iconActive: 'person-circle' },
];

export default function TabsLayout() {
  const { colors } = useAppTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, minHeight: 64 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarAccessibilityLabel: tab.title,
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons name={focused ? tab.iconActive : tab.icon} color={color} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
