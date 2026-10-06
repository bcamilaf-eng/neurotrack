import Constants from 'expo-constants';
import { APP_NAME, MEDICAL_DISCLAIMER, PRIVACY_SUMMARY, TAGLINE, TERMS_SUMMARY } from '../../../i18n/es';
import { AppText, Card, Screen } from '../../../ui/components';
import { BrandMark } from '../../../ui/features/auth/AuthHeader';

export default function AboutScreen() {
  const version = Constants.expoConfig?.version ?? '—';
  return (
    <Screen edges={['left', 'right']}>
      <BrandMark size={64} />
      <AppText variant="title" accessibilityLabel="NeuroTrack">
        {APP_NAME}
      </AppText>
      <AppText muted>{TAGLINE}</AppText>
      <AppText variant="caption" muted>
        Versión {version}
      </AppText>
      <Card>
        <AppText variant="label">Aviso médico</AppText>
        <AppText>{MEDICAL_DISCLAIMER}</AppText>
      </Card>
      <Card>
        <AppText variant="label">Términos de uso</AppText>
        {TERMS_SUMMARY.map((line) => (
          <AppText key={line} variant="caption">
            • {line}
          </AppText>
        ))}
      </Card>
      <Card>
        <AppText variant="label">Política de privacidad</AppText>
        {PRIVACY_SUMMARY.map((line) => (
          <AppText key={line} variant="caption">
            • {line}
          </AppText>
        ))}
      </Card>
    </Screen>
  );
}
