import { MEDICAL_DISCLAIMER } from '../../i18n/es';
import { AppText } from './AppText';
import { Card } from './Card';

/** Aviso médico obligatorio, visible en el acceso, en Perfil y en Acerca de. */
export function Disclaimer() {
  return (
    <Card>
      <AppText variant="label">Aviso médico</AppText>
      <AppText variant="caption" muted>
        {MEDICAL_DISCLAIMER}
      </AppText>
    </Card>
  );
}
