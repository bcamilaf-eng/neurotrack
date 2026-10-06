/**
 * Programación local de los recordatorios con expo-notifications.
 *
 * Todas las notificaciones llevan el mismo texto genérico (`REMINDER_BODY`), sin datos
 * clínicos; en Android, además, el canal oculta el contenido en la pantalla de bloqueo.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  anyEnabled,
  REMINDER_BODY,
  REMINDER_TITLE,
  REMINDER_TYPES,
  type ReminderSettings,
} from '../../domain/reminders';

const CHANNEL_ID = 'recordatorios';
const ID_PREFIX = 'neurotrack-recordatorio-';

/** Cómo se muestran las notificaciones con la app abierta. Se llama una vez al arrancar. */
export function configureNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Pide permiso solo si hace falta. Devuelve si se pueden mostrar notificaciones. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Cancela los recordatorios de NeuroTrack ya programados. */
export async function cancelReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/** Reprograma los recordatorios según los ajustes. Devuelve cuántos quedaron activos. */
export async function applyReminders(settings: ReminderSettings): Promise<number> {
  await cancelReminders();
  if (!anyEnabled(settings)) return 0;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Recordatorios',
      importance: Notifications.AndroidImportance.DEFAULT,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
  }
  let count = 0;
  for (const reminder of REMINDER_TYPES) {
    const setting = settings[reminder.code];
    if (!setting.enabled) continue;
    const [hour, minute] = setting.time.split(':').map(Number);
    await Notifications.scheduleNotificationAsync({
      identifier: `${ID_PREFIX}${reminder.code}`,
      content: { title: REMINDER_TITLE, body: REMINDER_BODY },
      trigger:
        'weekly' in reminder
          ? {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday: setting.weekday ?? 2,
              hour,
              minute,
              channelId: CHANNEL_ID,
            }
          : { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL_ID },
    });
    count += 1;
  }
  return count;
}
