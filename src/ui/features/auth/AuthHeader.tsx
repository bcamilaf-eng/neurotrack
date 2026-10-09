import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { APP_NAME } from '../../../i18n/es';
import { AppText } from '../../components';
import { spacing } from '../../theme';
import { useAppTheme } from '../../theme/ThemeContext';

/** Marca de NEUROTRACK: cabeza de perfil con una línea de pulso neuronal. */
export function BrandMark({ size = 56 }: { size?: number }) {
  const { colors } = useAppTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx="32" cy="32" r="30" fill={colors.primarySoft} />
      <Path
        d="M40 50v-6h4.5a2.5 2.5 0 0 0 2.5-2.5V36l3-1.5-3-5.5c0-9.4-6.7-16-15.5-16S16 19.6 16 28.5c0 5.4 2.6 9.6 6 12.4V50"
        fill="none"
        stroke={colors.primary}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M21 29h5l2.5-5 4 10 2.5-5h5"
        fill="none"
        stroke={colors.accent}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function AuthHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <BrandMark size={40} />
        <AppText variant="label" accessibilityLabel="NeuroTrack">
          {APP_NAME}
        </AppText>
      </View>
      <AppText variant="title">{title}</AppText>
      {subtitle ? <AppText muted>{subtitle}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.sm },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
});
