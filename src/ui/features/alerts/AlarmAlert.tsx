/**
 * Aviso de señal de alarma (§16): mensaje fijo, sin diagnóstico ni lenguaje alarmista,
 * con acceso directo a llamar al número de emergencias o al contacto de emergencia.
 */
import { Linking, StyleSheet, View } from 'react-native';
import { ALARM_MESSAGE, ALARM_SIGNALS, emergencyNumber } from '../../../domain/alerts/rules';
import { labelOf } from '../../../domain/catalogs';
import type { AlarmFlag } from '../../../data/repositories/alarmRepository';
import type { EmergencyContact } from '../../../data/repositories/accountRepository';
import { AppText, Banner, Button, Card } from '../../components';
import { spacing } from '../../theme';

export interface AlarmAlertProps {
  flags: AlarmFlag[];
  contact: EmergencyContact | null;
  country?: string;
  onAcknowledge: () => void;
}

/** Deja solo los caracteres que entiende el marcador del teléfono. */
export const dialable = (phone: string) => phone.replace(/[^\d+]/g, '');

export function AlarmAlert({ flags, contact, country, onAcknowledge }: AlarmAlertProps) {
  if (flags.length === 0) return null;
  const pending = flags.some((f) => !f.acknowledgedAt);
  const number = emergencyNumber(country);
  const call = (phone: string) => Linking.openURL(`tel:${dialable(phone)}`).catch(() => undefined);

  return (
    <Card>
      <View testID="alarm-alert" style={styles.body}>
        <Banner tone={pending ? 'danger' : 'warning'} message={ALARM_MESSAGE} />
        <View style={styles.list}>
          <AppText variant="label">Lo que registraste</AppText>
          {flags.map((f) => (
            <AppText key={f.id}>• {labelOf(ALARM_SIGNALS, f.signal)}</AppText>
          ))}
        </View>
        <Button label={`Llamar a emergencias (${number})`} variant="danger" onPress={() => call(number)} testID="alarm-call-emergency" />
        {contact ? (
          <Button
            label={`Llamar a ${contact.name}`}
            variant="secondary"
            onPress={() => call(contact.phone)}
            testID="alarm-call-contact"
          />
        ) : (
          <AppText variant="caption" muted>
            Puedes guardar un contacto de emergencia en Perfil › Datos personales.
          </AppText>
        )}
        {pending ? <Button label="Entendido" variant="ghost" onPress={onAcknowledge} testID="alarm-acknowledge" /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.md },
  list: { gap: spacing.xs },
});
