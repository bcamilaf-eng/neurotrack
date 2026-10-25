/**
 * Menú de registro: tarjetas por tipo con ícono y color, y lo que ya anotaste hoy.
 * Episodio va primero y más grande porque es lo más importante de registrar.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, PressableScale, Screen } from '../../ui/components';
import { useDashboard } from '../../ui/features/dashboard/useDashboard';
import { type Palette, radius, spacing } from '../../ui/theme';
import { useAppTheme } from '../../ui/theme/ThemeContext';

type IconName = ComponentProps<typeof Ionicons>['name'];
type Tint = 'primary' | 'warning' | 'success' | 'accent';

const tintOf = (colors: Palette, tint: Tint) =>
  ({
    primary: { fg: colors.primary, bg: colors.primarySoft },
    warning: { fg: colors.warning, bg: colors.warningSoft },
    success: { fg: colors.success, bg: colors.successSoft },
    accent: { fg: colors.accent, bg: colors.accentSoft },
  })[tint];

function Tile({
  icon,
  tint,
  title,
  subtitle,
  status,
  onPress,
  wide,
}: {
  icon: IconName;
  tint: Tint;
  title: string;
  subtitle: string;
  status?: string;
  onPress: () => void;
  wide?: boolean;
}) {
  const { colors } = useAppTheme();
  const t = tintOf(colors, tint);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={[title, status, subtitle].filter(Boolean).join('. ')}
      onPress={onPress}
      containerStyle={wide ? styles.wideCell : styles.cell}
      style={[styles.tile, wide && styles.wide, { backgroundColor: colors.surface, borderColor: colors.border }]}
      pressedStyle={{ backgroundColor: colors.surfaceMuted }}
    >
      <View style={[styles.icon, { backgroundColor: t.bg }]}>
        <Ionicons name={icon} size={wide ? 26 : 22} color={t.fg} importantForAccessibility="no" />
      </View>
      <View style={styles.text}>
        <AppText variant={wide ? 'heading' : 'label'}>{title}</AppText>
        <AppText variant="caption" muted numberOfLines={2}>
          {subtitle}
        </AppText>
      </View>
      {status ? (
        <View style={[styles.status, { backgroundColor: t.bg }]}>
          <AppText variant="caption" color={t.fg}>
            {status}
          </AppText>
        </View>
      ) : null}
    </PressableScale>
  );
}

export default function RegisterScreen() {
  const { data } = useDashboard();
  const today = data?.today;
  const liters = (ml: number) => `${(ml / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} L`;

  return (
    <Screen>
      <AppText variant="title">Registrar</AppText>
      <Tile
        wide
        icon="pulse"
        tint="primary"
        title="Episodio"
        subtitle="Intensidad, localización, síntomas y posibles desencadenantes."
        status={data?.ongoing.length ? 'En curso' : data?.todayEpisodes ? `${data.todayEpisodes} hoy` : undefined}
        onPress={() => router.push('/episodio/nuevo')}
      />
      <View style={styles.grid}>
        <Tile
          icon="body-outline"
          tint="warning"
          title="Síntomas"
          subtitle="Síntomas y aura de un episodio."
          onPress={() => router.push({ pathname: '/episodio/nuevo', params: { paso: '2' } })}
        />
        <Tile
          icon="medical-outline"
          tint="success"
          title="Medicación"
          subtitle="Dosis, hora y cómo te sentó."
          status={today?.medicationCount ? `${today.medicationCount} hoy` : undefined}
          onPress={() => router.push('/registro/medicacion')}
        />
      </View>

      <AppText variant="heading">Tu día</AppText>
      <View style={styles.grid}>
        <Tile
          icon="moon-outline"
          tint="primary"
          title="Sueño"
          subtitle="Horas, calidad y despertares."
          status={today?.sleepHours != null ? `${today.sleepHours.toLocaleString('es-ES')} h` : undefined}
          onPress={() => router.push('/registro/sueno')}
        />
        <Tile
          icon="water-outline"
          tint="accent"
          title="Hidratación"
          subtitle="Vasos y meta del día."
          status={today?.hydration ? liters(today.hydration.amountMl) : undefined}
          onPress={() => router.push('/registro/hidratacion')}
        />
      </View>
      <View style={styles.grid}>
        <Tile
          icon="restaurant-outline"
          tint="warning"
          title="Alimentación"
          subtitle="Comidas, horarios y ayuno."
          onPress={() => router.push('/registro/alimentacion')}
        />
        <Tile
          icon="happy-outline"
          tint="success"
          title="Estado del día"
          subtitle="Estrés, ánimo y día sin dolor."
          status={data?.todayPainFree ? 'Sin dolor' : undefined}
          onPress={() => router.push('/registro/estado')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: spacing.md },
  cell: { flex: 1, flexBasis: 0 },
  wideCell: { alignSelf: 'stretch' },
  tile: { flex: 1, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg, gap: spacing.md, minHeight: 150 },
  wide: { flexDirection: 'row', alignItems: 'center', minHeight: 0 },
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  status: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 2 },
});
