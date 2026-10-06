/**
 * Raíz de la app: configura servicios, tema y protección de rutas según el estado de sesión.
 */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, AppState, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { destroyLocalDatabase, openDatabase } from '../data/db/expoDatabase';
import { createAuthService } from '../services/auth';
import { biometrics } from '../services/security/biometrics';
import { configureServices } from '../state/services';
import { useSession } from '../state/sessionStore';
import { AppText, Banner, Screen } from '../ui/components';
import { ThemeProvider, useAppTheme } from '../ui/theme/ThemeContext';

configureServices({
  auth: createAuthService(),
  openDatabase,
  destroyLocalData: destroyLocalDatabase,
  biometrics,
});

export default function RootLayout() {
  const theme = useSession((s) => s.settings?.theme);
  return (
    <SafeAreaProvider>
      <ThemeProvider preference={theme}>
        <AppNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppNavigator() {
  const { status, fatalError, initialize, onBackground, onForeground } = useSession();
  const { colors, dark } = useAppTheme();

  useEffect(() => {
    initialize().catch(() => undefined);
  }, [initialize]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') onForeground();
      else if (state === 'background') onBackground();
    });
    return () => sub.remove();
  }, [onBackground, onForeground]);

  if (status === 'initializing') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]} accessibilityLabel="Cargando NeuroTrack">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (fatalError) {
    return (
      <Screen>
        <AppText variant="title">No se pudo abrir NeuroTrack</AppText>
        <Banner tone="danger" message={fatalError} />
      </Screen>
    );
  }

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Protected guard={status === 'signedOut'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'needsConsent'}>
          <Stack.Screen name="consent" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'locked'}>
          <Stack.Screen name="lock" options={{ gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={status === 'ready'}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="episodio" />
        </Stack.Protected>
        <Stack.Screen name="reset-password" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
