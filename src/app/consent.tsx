/**
 * Consentimiento informado y granular, previo a cualquier registro clínico.
 * Los consentimientos obligatorios se distinguen de los opcionales; ninguno viene marcado.
 */
import { useState } from 'react';
import { CONSENT_TYPES, type ConsentType, REQUIRED_CONSENTS } from '../domain/catalogs';
import { CONSENT_TEXTS, MEDICAL_DISCLAIMER, PRIVACY_SUMMARY } from '../i18n/es';
import { useSession } from '../state/sessionStore';
import { AppText, Banner, Button, Card, Checkbox, Screen } from '../ui/components';
import { AuthHeader } from '../ui/features/auth/AuthHeader';

export default function ConsentScreen() {
  const { acceptConsents, signOut } = useSession();
  const [decisions, setDecisions] = useState<Record<ConsentType, boolean>>({
    terms: false,
    health_data: false,
    cloud_sync: false,
    pattern_analysis: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requiredOk = REQUIRED_CONSENTS.every((type) => decisions[type]);

  const onContinue = async () => {
    setSaving(true);
    setError(null);
    try {
      await acceptConsents(decisions);
    } catch {
      setError('No se pudo guardar tu decisión. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      footer={
        <>
          <Button
            label="Continuar"
            onPress={onContinue}
            loading={saving}
            disabled={!requiredOk}
            hint={requiredOk ? undefined : 'Acepta los dos consentimientos obligatorios para continuar'}
            testID="consent-continue"
          />
          <Button label="Salir" variant="ghost" onPress={() => signOut()} />
        </>
      }
    >
      <AuthHeader title="Tus datos, tus decisiones" subtitle="Lee cómo protegemos tu información antes de empezar." />
      <Card>
        {PRIVACY_SUMMARY.map((line) => (
          <AppText key={line} variant="caption">
            • {line}
          </AppText>
        ))}
      </Card>
      {error ? <Banner tone="danger" message={error} /> : null}
      {CONSENT_TYPES.map(({ code }) => (
        <Checkbox
          key={code}
          testID={`consent-${code}`}
          label={CONSENT_TEXTS[code].title}
          description={CONSENT_TEXTS[code].description}
          required={REQUIRED_CONSENTS.includes(code)}
          checked={decisions[code]}
          onChange={(checked) => setDecisions((d) => ({ ...d, [code]: checked }))}
        />
      ))}
      <AppText variant="caption" muted>
        {MEDICAL_DISCLAIMER} Puedes cambiar los consentimientos opcionales en Perfil › Privacidad.
      </AppText>
    </Screen>
  );
}
