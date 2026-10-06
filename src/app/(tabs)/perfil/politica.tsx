import { PRIVACY_POLICY } from '../../../i18n/legal';
import { LegalDocument } from '../../../ui/features/legal/LegalDocument';

export default function PrivacyPolicyScreen() {
  return <LegalDocument sections={PRIVACY_POLICY} />;
}
