/** Bloque plegable: un título que se toca para ver u ocultar el detalle. Empieza cerrado. */
import Ionicons from '@expo/vector-icons/Ionicons';
import { type ReactNode, useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, View } from 'react-native';
import { MIN_TOUCH, spacing, useReducedMotion } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { Card } from './Card';

export function Collapsible({ title, children, testID }: { title: string; children: ReactNode; testID?: string }) {
  const { colors } = useAppTheme();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        onPress={() => {
          if (!reduced) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((o) => !o);
        }}
        style={styles.header}
      >
        <AppText variant="label" style={styles.title}>
          {title}
        </AppText>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} importantForAccessibility="no" />
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TOUCH - 8, gap: spacing.sm },
  title: { flex: 1 },
  body: { gap: spacing.sm },
});
