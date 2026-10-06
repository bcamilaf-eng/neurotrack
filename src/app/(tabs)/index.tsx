/** Inicio. En esta versión: saludo y estado de la cuenta; el resumen llega con el registro de episodios. */
import { useEffect, useState } from 'react';
import { LOCAL_MODE_NOTICE } from '../../i18n/es';
import { getRepositories } from '../../state/services';
import { useSession } from '../../state/sessionStore';
import { AppText, Banner, Card, ComingSoon, Disclaimer, Screen } from '../../ui/components';

function greeting(hour: number) {
  if (hour < 12) return 'Buenos días';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function HomeScreen() {
  const { user, mode } = useSession();
  const [name, setName] = useState<string | undefined>();

  useEffect(() => {
    if (!user) return;
    getRepositories()
      .then((repos) => repos.account.getProfile(user.id))
      .then((profile) => setName(profile?.name))
      .catch(() => undefined);
  }, [user]);

  return (
    <Screen>
      <AppText variant="title">
        {greeting(new Date().getHours())}
        {name ? `, ${name}` : ''}
      </AppText>
      {mode === 'local' ? <Banner tone="info" message={LOCAL_MODE_NOTICE} /> : null}
      <Card>
        <AppText variant="label">Tu registro está protegido</AppText>
        <AppText variant="caption" muted>
          Los datos se guardan cifrados en este teléfono. Puedes activar el bloqueo con Face ID o huella en Perfil ›
          Seguridad.
        </AppText>
      </Card>
      <ComingSoon
        title="Resumen del mes"
        description="Episodios, días con dolor, intensidad y duración promedio, y días desde el último episodio."
      />
      <ComingSoon title="Acciones rápidas" description="Registrar episodio, síntomas, medicación o un día sin dolor." />
      <Disclaimer />
    </Screen>
  );
}
