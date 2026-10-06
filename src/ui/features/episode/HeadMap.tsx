/**
 * Mapa de la cabeza (vista frontal y posterior) para marcar dónde duele.
 * Es un atajo visual: la lista de localizaciones de abajo ofrece lo mismo y es la que
 * usan los lectores de pantalla.
 */
import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { PainLocation } from '../../../domain/catalogs';
import { AppText } from '../../components';
import { spacing } from '../../theme';
import { useAppTheme } from '../../theme/ThemeContext';

export interface HeadMapProps {
  selected: readonly PainLocation[];
  onToggle: (location: PainLocation) => void;
}

export function HeadMap({ selected, onToggle }: HeadMapProps) {
  const { colors } = useAppTheme();
  const zone = (code: PainLocation) => ({
    fill: selected.includes(code) ? colors.primary : colors.surfaceMuted,
    fillOpacity: selected.includes(code) ? 0.75 : 1,
    stroke: selected.includes(code) ? colors.primary : colors.border,
    strokeWidth: 1.5,
    onPress: () => onToggle(code),
  });
  const outline = { fill: colors.surface, stroke: colors.textMuted, strokeWidth: 2 };
  const label = { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' as const };

  return (
    <View style={styles.wrapper} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <AppText variant="caption" muted>
        Toca las zonas del mapa o elige en la lista.
      </AppText>
      <View style={styles.row}>
        <Svg width={150} height={190} viewBox="0 0 120 160">
          {/* Vista frontal: la derecha del paciente queda a la izquierda del dibujo. */}
          <Rect x={46} y={118} width={28} height={26} rx={6} {...outline} />
          <Ellipse cx={60} cy={70} rx={44} ry={54} {...outline} />
          <Path d="M24 46 Q60 4 96 46 L94 56 Q60 34 26 56 Z" {...zone('frontal')} />
          <G {...zone('temporal')}>
            <Ellipse cx={19} cy={74} rx={8} ry={15} />
            <Ellipse cx={101} cy={74} rx={8} ry={15} />
          </G>
          <G {...zone('retroocular')}>
            <Ellipse cx={44} cy={72} rx={10} ry={6} />
            <Ellipse cx={76} cy={72} rx={10} ry={6} />
          </G>
          <SvgText x={60} y={156} {...label}>
            De frente
          </SvgText>
          <SvgText x={14} y={104} {...label}>
            Der.
          </SvgText>
          <SvgText x={106} y={104} {...label}>
            Izq.
          </SvgText>
        </Svg>
        <Svg width={150} height={190} viewBox="0 0 120 160">
          <Rect x={42} y={116} width={36} height={28} rx={6} {...zone('neck')} />
          <Ellipse cx={60} cy={70} rx={44} ry={54} {...outline} />
          <Ellipse cx={60} cy={92} rx={30} ry={18} {...zone('occipital')} />
          <SvgText x={60} y={156} {...label}>
            De espaldas
          </SvgText>
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md },
});
