/** Bienvenida con el aviso médico, antes de crear cuenta o iniciar sesión. */
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { APP_NAME, LOCAL_MODE_NOTICE, TAGLINE } from '../../i18n/es';
import { useSession } from '../../state/sessionStore';
import { AppText, Banner, Button, Disclaimer, Screen } from '../../ui/components';
import { BrandMark } from '../../ui/features/auth/AuthHeader';
import { spacing } from '../../ui/theme';
import { useAppTheme } from '../../ui/theme/ThemeContext';

const FEATURES = [
  'Registra cada episodio en segundos, incluso sin conexión.',
  'Sigue sueño, hidratación, alimentación, estrés y medicación.',
  'Descubre tu evolución y lleva un informe claro a tu consulta.',
];

export default function WelcomeScreen() {
  const mode = useSession((s) => s.mode);
  const { colors } = useAppTheme();
  return (
    <Screen
      footer={
        <>
          <Button label="Crear cuenta" onPress={() => router.push('/sign-up')} testID="go-sign-up" />
          <Button label="Ya tengo cuenta" variant="secondary" onPress={() => router.push('/sign-in')} />
        </>
      }
    >
      <View style={styles.hero}>
        <BrandMark size={72} />
        <AppText variant="display" accessibilityLabel="NeuroTrack">
          {APP_NAME}
        </AppText>
        <AppText variant="heading" muted>
          {TAGLINE}
        </AppText>
      </View>
      <View style={styles.list}>
        {FEATURES.map((feature) => (
          <View key={feature} style={styles.item}>
            <AppText color={colors.accent} importantForAccessibility="no">
              ●
            </AppText>
            <AppText style={styles.itemText}>{feature}</AppText>
          </View>
        ))}
      </View>
      {mode === 'local' ? <Banner tone="info" message={LOCAL_MODE_NOTICE} /> : null}
      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.xl },
  list: { gap: spacing.md },
  item: { flexDirection: 'row', gap: spacing.md },
  itemText: { flex: 1 },
});
