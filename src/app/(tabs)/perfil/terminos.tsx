import { TERMS_OF_USE } from '../../../i18n/legal';
import { LegalDocument } from '../../../ui/features/legal/LegalDocument';

export default function TermsScreen() {
  return <LegalDocument sections={TERMS_OF_USE} />;
}
