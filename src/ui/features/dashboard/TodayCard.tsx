/**
 * Resumen del día: cómo va hoy (episodio en curso, día sin dolor o nada anotado) y
 * tres datos de un vistazo (sueño, agua y medicación). Cada dato lleva a su registro.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card, PressableScale } from '../../components';
import { radius, spacing } from '../../theme';
import { useAppTheme } from '../../theme/ThemeContext';
import { clock } from '../../../utils/clock';
import type { DashboardData } from './useDashboard';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface Status {
  icon: IconName;
  tone: 'neutral' | 'warning' | 'success';
  title: string;
  detail?: string;
}

function statusOf(data: DashboardData): Status {
  const ongoing = data.ongoing[0];
  if (ongoing) {
    return {
      icon: 'pulse',
      tone: 'warning',
      title: 'Tienes un episodio en curso',
      detail: `Empezó ${format(parseISO(ongoing.startedAt), "EEEE 'a las' HH:mm", { locale: es })} · intensidad máxima ${ongoing.maxIntensity}/10`,
    };
  }
  if (data.todayEpisodes > 0) {
    return {
      icon: 'flash',
      tone: 'warning',
      title: data.todayEpisodes === 1 ? 'Hoy registraste un episodio' : `Hoy registraste ${data.todayEpisodes} episodios`,
      detail: 'Cuídate. Puedes completar el registro cuando te sientas mejor.',
    };
  }
  if (data.todayPainFree) {
    return { icon: 'checkmark-circle', tone: 'success', title: 'Registraste hoy como un día sin dolor.' };
  }
  return {
    icon: 'partly-sunny',
    tone: 'neutral',
    title: '¿Cómo va tu día?',
    detail: 'Anota un episodio si aparece, o marca el día sin dolor cuando lo sepas.',
  };
}

function Tile({
  icon,
  label,
  value,
  progress,
  onPress,
}: {
  icon: IconName;
  label: string;
  value: string;
  progress?: number;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityHint={`Abre el registro de ${label.toLowerCase()}`}
      onPress={onPress}
      containerStyle={styles.cell}
      style={[styles.tile, { backgroundColor: colors.surfaceMuted }]}
      pressedStyle={{ backgroundColor: colors.border }}
    >
      <Ionicons name={icon} size={20} color={colors.primary} importantForAccessibility="no" />
      <AppText variant="label" numberOfLines={1}>
        {value}
      </AppText>
      <AppText variant="caption" muted numberOfLines={1}>
        {label}
      </AppText>
      {progress !== undefined ? (
        <View style={[styles.track, { backgroundColor: colors.border }]}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%`, backgroundColor: colors.accent }]} />
        </View>
      ) : null}
    </PressableScale>
  );
}

const liters = (ml: number) => (ml / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 });

export function TodayCard({ data }: { data: DashboardData }) {
  const { colors } = useAppTheme();
  const status = statusOf(data);
  const tint = { neutral: colors.primary, warning: colors.warning, success: colors.success }[status.tone];
  const soft = { neutral: colors.primarySoft, warning: colors.warningSoft, success: colors.successSoft }[status.tone];
  const { sleepHours, hydration, medicationCount } = data.today;
  const ongoing = data.ongoing[0];

  return (
    <Card>
      <AppText variant="caption" muted style={styles.eyebrow}>
        HOY · {format(clock.now(), "EEEE d 'de' MMMM", { locale: es }).toUpperCase()}
      </AppText>
      <View style={styles.status} accessible accessibilityRole="summary">
        <View style={[styles.badge, { backgroundColor: soft }]}>
          <Ionicons name={status.icon} size={24} color={tint} importantForAccessibility="no" />
        </View>
        <View style={styles.statusText}>
          <AppText variant="heading">{status.title}</AppText>
          {status.detail ? (
            <AppText variant="caption" muted>
              {status.detail}
            </AppText>
          ) : null}
        </View>
      </View>
      {ongoing ? (
        <Button
          label="Ver y actualizar"
          variant="secondary"
          icon="create-outline"
          onPress={() => router.push({ pathname: '/episodio/[id]', params: { id: ongoing.id } })}
        />
      ) : null}
      <View style={styles.tiles}>
        <Tile
          icon="moon-outline"
          label="Sueño"
          value={sleepHours === null ? 'Anotar' : `${sleepHours.toLocaleString('es-ES')} h`}
          onPress={() => router.push('/registro/sueno')}
        />
        <Tile
          icon="water-outline"
          label="Agua"
          value={hydration ? `${liters(hydration.amountMl)} / ${liters(hydration.goalMl)} L` : 'Anotar'}
          progress={hydration && hydration.goalMl > 0 ? Math.min(1, hydration.amountMl / hydration.goalMl) : undefined}
          onPress={() => router.push('/registro/hidratacion')}
        />
        <Tile
          icon="medical-outline"
          label="Medicación"
          value={medicationCount === 0 ? 'Ninguna' : medicationCount === 1 ? '1 toma' : `${medicationCount} tomas`}
          onPress={() => router.push('/registro/medicacion')}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, flexBasis: 0 },
  eyebrow: { letterSpacing: 0.8 },
  status: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  badge: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  statusText: { flex: 1, gap: 2 },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1, borderRadius: radius.md, padding: spacing.md, gap: 2, minHeight: 96 },
  track: { height: 4, borderRadius: 2, marginTop: spacing.xs, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
});
