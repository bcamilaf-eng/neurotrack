/** Centro de privacidad: resumen, consentimientos opcionales y eliminación de la cuenta. */
import { useEffect, useState } from 'react';
import { type ConsentType } from '../../../domain/catalogs';
import { CONSENT_TEXTS, PRIVACY_SUMMARY } from '../../../i18n/es';
import { getRepositories } from '../../../state/services';
import { useSession } from '../../../state/sessionStore';
import { AppText, Banner, Button, Card, Screen, SwitchRow } from '../../../ui/components';
import { confirmDestructive } from '../../../ui/confirm';

const OPTIONAL: ConsentType[] = ['cloud_sync', 'pattern_analysis'];

export default function PrivacyScreen() {
  const { user, acceptConsents, deleteAccount } = useSession();
  const [optional, setOptional] = useState<Partial<Record<ConsentType, boolean>>>({});
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      <AppText variant="heading">Eliminar cuenta</AppText>
      <AppText variant="caption" muted>
        La exportación completa de tus datos y el borrado de registros sin eliminar la cuenta estarán disponibles en una
        próxima versión.
      </AppText>
      <Button label="Eliminar mi cuenta y mis datos" variant="danger" onPress={onDelete} loading={deleting} />
    </Screen>
  );
}
