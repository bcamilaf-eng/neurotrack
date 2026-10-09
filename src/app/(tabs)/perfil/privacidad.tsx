/**
 * Centro de privacidad: resumen, consentimientos opcionales, copia de tus datos, borrado
 * de registros y eliminación de la cuenta.
 */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { type ConsentType } from '../../../domain/catalogs';
import { CONSENT_TEXTS, PRIVACY_SUMMARY } from '../../../i18n/es';
import { shareJson } from '../../../services/export/fileExport';
import { getRepositories } from '../../../state/services';
import { useSession } from '../../../state/sessionStore';
import { AppText, Banner, Button, Card, ListRow, Screen, SwitchRow } from '../../../ui/components';
import { clock } from '../../../utils/clock';
import { confirmDestructive } from '../../../ui/confirm';

const OPTIONAL: ConsentType[] = ['cloud_sync', 'pattern_analysis'];

export default function PrivacyScreen() {
  const { user, acceptConsents, deleteAccount } = useSession();
  const [optional, setOptional] = useState<Partial<Record<ConsentType, boolean>>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState<'export' | 'records' | null>(null);

  useEffect(() => {
    if (!user) return;
    getRepositories()
      .then((repos) => repos.account.currentConsents(user.id))
      .then((current) => setOptional(Object.fromEntries(OPTIONAL.map((t) => [t, !!current[t]?.accepted]))));
  }, [user]);

  const toggle = async (type: ConsentType, accepted: boolean) => {
    setOptional((o) => ({ ...o, [type]: accepted }));
    try {
      await acceptConsents({ [type]: accepted });
    } catch {
      setOptional((o) => ({ ...o, [type]: !accepted }));
      setError('No se pudo guardar el cambio.');
    }
  };

  const onExport = async () => {
    if (!user) return;
    setError(null);
    setNotice(null);
    setBusy('export');
    try {
      const data = await (await getRepositories()).account.exportAllData(user.id);
      await shareJson(data, `neurotrack-datos-${clock.now().toISOString().slice(0, 10)}`);
      setNotice('Listo. El archivo temporal se borró del teléfono.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo exportar tus datos.');
    } finally {
      setBusy(null);
    }
  };

  const onDeleteRecords = async () => {
    if (!user) return;
    const ok = await confirmDestructive({
      title: '¿Borrar todos tus registros?',
      message:
        'Se borrarán de este teléfono tus episodios, medicación, hábitos, señales y contacto de emergencia. Tu cuenta, tus consentimientos y tus ajustes se conservan. No se puede deshacer.',
      confirmLabel: 'Borrar registros',
    });
    if (!ok) return;
    setError(null);
    setNotice(null);
    setBusy('records');
    try {
      await (await getRepositories()).account.deleteAllData(user.id, { keepAccount: true });
      setNotice('Se borraron todos tus registros.');
    } catch {
      setError('No se pudieron borrar tus registros.');
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async () => {
    const ok = await confirmDestructive({
      title: '¿Eliminar tu cuenta?',
      message:
        'Se borrarán de forma definitiva tu cuenta y todos tus registros en este teléfono y en la nube. No se puede deshacer.',
      confirmLabel: 'Eliminar todo',
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteAccount();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la cuenta.');
      setDeleting(false);
    }
  };

  return (
    <Screen edges={['left', 'right']}>
      <Card>
        {PRIVACY_SUMMARY.map((line) => (
          <AppText key={line} variant="caption">
            • {line}
          </AppText>
        ))}
      </Card>
      {error ? <Banner tone="danger" message={error} /> : null}
      <AppText variant="heading">Consentimientos opcionales</AppText>
      {OPTIONAL.map((type) => (
        <SwitchRow
          key={type}
          label={CONSENT_TEXTS[type].title}
          description={CONSENT_TEXTS[type].description}
          value={!!optional[type]}
          onChange={(v) => toggle(type, v)}
        />
      ))}
      <AppText variant="heading">Tus datos</AppText>
      {notice ? <Banner tone="info" message={notice} /> : null}
      <AppText variant="caption" muted>
        Descarga una copia completa (JSON) de tu perfil, ajustes y registros. Solo sale del teléfono si eliges dónde
        guardarla o compartirla.
      </AppText>
      <Button label="Exportar todos mis datos" variant="secondary" onPress={onExport} loading={busy === 'export'} disabled={!!busy} testID="export-all" />
      <Button label="Borrar mis registros y conservar la cuenta" variant="secondary" onPress={onDeleteRecords} loading={busy === 'records'} disabled={!!busy} testID="delete-records" />
      <View>
        <ListRow title="Política de privacidad" onPress={() => router.push('/perfil/politica')} />
        <ListRow title="Términos de uso" onPress={() => router.push('/perfil/terminos')} />
      </View>
      <AppText variant="heading">Eliminar cuenta</AppText>
      <Button label="Eliminar mi cuenta y mis datos" variant="danger" onPress={onDelete} loading={deleting} />
    </Screen>
  );
}
