/**
 * Registro rápido: el botón principal para un episodio y tres accesos cortos.
 * Marcar el día sin dolor confirma al instante con un aviso.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, PressableScale } from '../../components';
import { radius, spacing } from '../../theme';
import { useAppTheme } from '../../theme/ThemeContext';

type IconName = ComponentProps<typeof Ionicons>['name'];

function Action({
  icon,
  label,
  onPress,
  disabled,
  hint,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  hint?: string;
  testID?: string;
}) {
  const { colors } = useAppTheme();
  return (
    <PressableScale
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      containerStyle={styles.cell}
      style={[styles.action, { backgroundColor: colors.surface, borderColor: colors.border, opacity: disabled ? 0.45 : 1 }]}
      pressedStyle={{ backgroundColor: colors.surfaceMuted }}
    >
      <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={20} color={colors.primary} importantForAccessibility="no" />
      </View>
      <AppText variant="caption" style={styles.label} numberOfLines={2}>
        {label}
      </AppText>
    </PressableScale>
  );
}

export function QuickActions({
  canMarkPainFree,
  painFreeBlockedByEpisode,
  onPainFree,
}: {
  canMarkPainFree: boolean;
  painFreeBlockedByEpisode: boolean;
  onPainFree: () => void;
}) {
  return (
    <View style={styles.wrapper}>
      <Button
        label="Registrar episodio"
        icon="add-circle"
        size="large"
        onPress={() => router.push('/episodio/nuevo')}
        testID="quick-episode"
      />
      <View style={styles.row}>
        <Action
          icon="body-outline"
          label="Síntomas"
          hint="Abre el registro de episodio en el paso de síntomas"
          onPress={() => router.push({ pathname: '/episodio/nuevo', params: { paso: '2' } })}
        />
        <Action
          icon="sunny-outline"
          label="Día sin dolor"
          onPress={onPainFree}
          disabled={!canMarkPainFree}
          hint={painFreeBlockedByEpisode ? 'Hoy ya tiene un episodio registrado' : undefined}
          testID="quick-pain-free"
        />
        <Action
          icon="medical-outline"
          label="Medicación"
          onPress={() => router.push('/registro/medicacion/nueva')}
          testID="quick-medication"
        />
      </View>
      {painFreeBlockedByEpisode ? (
        <AppText variant="caption" muted>
          Hoy ya tiene un episodio registrado, así que no se puede marcar como día sin dolor.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, flexBasis: 0 },
  wrapper: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 92,
  },
  icon: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  label: { textAlign: 'center' },
});
