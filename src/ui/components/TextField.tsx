import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, type TextInputProps, View } from 'react-native';
import { MIN_TOUCH, radius, spacing, typography } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  help?: string;
  /** Muestra un botón para ver u ocultar la contraseña. */
  secureToggle?: boolean;
}

/** Campo de texto con etiqueta visible, ayuda y error anunciados por el lector de pantalla. */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, help, secureToggle, secureTextEntry, ...rest },
  ref,
) {
  const { colors } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);
  const description = error ?? help;
  return (
    <View style={styles.wrapper}>
      <AppText variant="label">{label}</AppText>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : focused ? colors.focus : colors.border,
            borderWidth: focused || error ? 2 : 1,
          },
        ]}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={description}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[styles.input, typography.body, { color: colors.text }]}
          {...rest}
        />
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar contraseña' : 'Ocultar contraseña'}
            onPress={() => setHidden((h) => !h)}
            style={styles.toggle}
          >
            <AppText variant="caption" color={colors.primary}>
              {hidden ? 'Mostrar' : 'Ocultar'}
            </AppText>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color={colors.danger} accessibilityLiveRegion="polite" accessibilityRole="alert">
          ⚠ {error}
        </AppText>
      ) : help ? (
        <AppText variant="caption" muted>
          {help}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, minHeight: MIN_TOUCH + 4 },
  input: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  toggle: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: spacing.md },
});
