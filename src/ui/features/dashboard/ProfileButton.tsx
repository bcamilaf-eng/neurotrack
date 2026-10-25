/** Acceso a Perfil desde Inicio: un círculo con la inicial del nombre (o un ícono si no hay nombre). */
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { AppText, PressableScale } from '../../components';
import { radius } from '../../theme';
import { useAppTheme } from '../../theme/ThemeContext';

export function ProfileButton({ name }: { name?: string }) {
  const { colors } = useAppTheme();
  const initial = name?.trim().charAt(0).toUpperCase();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Perfil y ajustes"
      testID="open-profile"
      onPress={() => router.push('/perfil')}
      style={[styles.avatar, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}
    >
      {initial ? (
        <AppText variant="heading" color={colors.primary}>
          {initial}
        </AppText>
      ) : (
        <Ionicons name="person" size={22} color={colors.primary} importantForAccessibility="no" />
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
