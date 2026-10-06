/**
 * Campo de fecha u hora con el selector nativo del sistema.
 * El valor viaja como texto (`YYYY-MM-DD` o `HH:mm`) para que el dominio lo valide.
 */
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { MIN_TOUCH, radius, spacing } from '../theme';
import { useAppTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

export interface DateTimeFieldProps {
  label: string;
  mode: 'date' | 'time';
  value: string;
  onChange: (value: string) => void;
  maximumDate?: Date;
  error?: string;
  testID?: string;
}

const PATTERN = { date: 'yyyy-MM-dd', time: 'HH:mm' } as const;

function toDate(mode: 'date' | 'time', value: string): Date {
  const parsed = value ? parse(value, PATTERN[mode], new Date()) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function display(mode: 'date' | 'time', value: string): string {
  if (!value) return mode === 'date' ? 'Elegir fecha' : 'Elegir hora';
  const date = toDate(mode, value);
  return mode === 'date' ? format(date, "EEEE d 'de' MMMM yyyy", { locale: es }) : format(date, 'HH:mm');
}

export function DateTimeField({ label, mode, value, onChange, maximumDate, error, testID }: DateTimeFieldProps) {
  const { colors, dark } = useAppTheme();
  const current = toDate(mode, value);
  const emit = (date: Date) => onChange(format(date, PATTERN[mode]));

  const openAndroid = () =>
    DateTimePickerAndroid.open({
      value: current,
      mode,
      is24Hour: true,
      maximumDate,
      onValueChange: (_event, date) => emit(date),
    });

  return (
    <View style={styles.wrapper}>
      <AppText variant="label">{label}</AppText>
      {Platform.OS === 'ios' ? (
        <View style={styles.iosRow}>
          <DateTimePicker
            testID={testID}
            value={current}
            mode={mode}
            display="compact"
            locale="es-ES"
            maximumDate={maximumDate}
            themeVariant={dark ? 'dark' : 'light'}
            accessibilityLabel={label}
            onValueChange={(_event, date) => emit(date)}
          />
        </View>
      ) : (
        <Pressable
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${display(mode, value)}`}
          accessibilityHint="Abre el selector"
          onPress={openAndroid}
          style={[styles.button, { backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border }]}
        >
          <AppText>{display(mode, value)}</AppText>
        </Pressable>
      )}
      {error ? (
        <AppText variant="caption" color={colors.danger} accessibilityRole="alert">
          ⚠ {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  iosRow: { flexDirection: 'row', minHeight: MIN_TOUCH, alignItems: 'center' },
  button: { minHeight: MIN_TOUCH + 4, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, justifyContent: 'center' },
});
