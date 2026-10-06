import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';

export interface ScreenProps {
  children: ReactNode;
  /** Desplazable (formularios, listas cortas). */
  scroll?: boolean;
  footer?: ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

/** Contenedor de pantalla: zona segura, fondo del tema y teclado que no tapa los campos. */
export function Screen({ children, scroll = true, footer, edges = ['top', 'left', 'right'] }: ScreenProps) {
  const { colors } = useAppTheme();
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.fill]}>{children}</View>
  );
  return (
    <SafeAreaView edges={edges} style={[styles.fill, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {content}
        {footer ? <View style={[styles.footer, { borderTopColor: colors.border }]}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  footer: { padding: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.sm },
});
