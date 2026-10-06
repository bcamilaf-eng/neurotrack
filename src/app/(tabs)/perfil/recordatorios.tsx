/**
 * Recordatorios (§18): cada uno se activa por separado y con su hora. La notificación
 * solo dice «Tienes un registro pendiente», sin datos de salud.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { parseReminders, REMINDER_BODY, REMINDER_TYPES, type ReminderSettings, type ReminderType, WEEKDAYS } from '../../../domain/reminders';
import { ensureNotificationPermission } from '../../../services/notifications/reminders';
import { useSession } from '../../../state/sessionStore';
import { AppText, Banner, Card, DateTimeField, OptionGroup, Screen, SwitchRow } from '../../../ui/components';
import { spacing } from '../../../ui/theme';

export default function RemindersScreen() {
  const stored = useSession((s) => s.settings?.reminders);
  const saveReminders = useSession((s) => s.saveReminders);
  const [reminders, setReminders] = useState<ReminderSettings>(() => parseReminders(stored));
  const [message, setMessage] = useState<{ tone: 'warning' | 'danger'; text: string } | null>(null);

  const save = async (next: ReminderSettings) => {
    const previous = reminders;
    setReminders(next);
    setMessage(null);
    try {
      await saveReminders(next);
    } catch {
      setReminders(previous);
      setMessage({ tone: 'danger', text: 'No se pudieron guardar los recordatorios.' });
    }
  };

  const change = (code: ReminderType, patch: Partial<ReminderSettings[ReminderType]>) =>
    save({ ...reminders, [code]: { ...reminders[code], ...patch } });

  const toggle = async (code: ReminderType, enabled: boolean) => {
    if (enabled && !(await ensureNotificationPermission())) {
      setMessage({
        tone: 'warning',
        text: 'Las notificaciones están desactivadas para NeuroTrack. Actívalas en los ajustes del teléfono para usar recordatorios.',
      });
      return;
    }
    await change(code, { enabled });
  };

  return (
    <Screen edges={['left', 'right']}>
      <Banner
        tone="info"
        title="Sin datos de salud en la pantalla de bloqueo"
        message={`Todos los recordatorios muestran solo «${REMINDER_BODY}».`}
      />
      {message ? <Banner tone={message.tone} message={message.text} /> : null}
      {REMINDER_TYPES.map((r) => {
        const setting = reminders[r.code];
        return (
          <Card key={r.code}>
            <View testID={`reminder-${r.code}`} style={styles.body}>
              <SwitchRow label={r.label} description={r.description} value={setting.enabled} onChange={(v) => toggle(r.code, v)} />
              {setting.enabled ? (
                <>
                  <DateTimeField label="Hora" mode="time" value={setting.time} onChange={(time) => change(r.code, { time })} testID={`reminder-${r.code}-time`} />
                  {'weekly' in r ? (
                    <OptionGroup
                      label="Día de la semana"
                      options={WEEKDAYS}
                      value={String(setting.weekday ?? 2) as (typeof WEEKDAYS)[number]['code']}
                      onChange={(v) => v && change(r.code, { weekday: Number(v) })}
                    />
                  ) : null}
                </>
              ) : null}
            </View>
          </Card>
        );
      })}
      <AppText variant="caption" muted>
        Los recordatorios se programan en este teléfono y no necesitan conexión.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.sm },
});
