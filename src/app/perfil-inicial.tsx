/**
 * Primera entrada: se ofrece completar el perfil. Es opcional («Completar más tarde») y
 * se muestra una sola vez; después se edita en Perfil › Mis datos.
 */
import { useState } from 'react';
import { useSession } from '../state/sessionStore';
import { AppText, Banner, Button, Screen } from '../ui/components';
import { AuthHeader } from '../ui/features/auth/AuthHeader';
import { ProfileFields, useProfileForm } from '../ui/features/profile/ProfileForm';

export default function InitialProfileScreen() {
  const finishProfilePrompt = useSession((s) => s.finishProfilePrompt);
  const { form, loaded, save } = useProfileForm();
  const [leaving, setLeaving] = useState(false);

  const later = async () => {
    setLeaving(true);
    try {
      await finishProfilePrompt();
    } finally {
      setLeaving(false);
    }
  };

  return (
    <Screen
      footer={
        <>
          <Button
            label="Guardar y continuar"
            onPress={() => save(finishProfilePrompt)}
            loading={form.submitting}
            disabled={!loaded}
            testID="profile-initial-save"
          />
          <Button label="Completar más tarde" variant="ghost" onPress={later} loading={leaving} testID="profile-initial-later" />
        </>
      }
    >
      <AuthHeader
        title="Completa tu perfil"
        subtitle="Con estos datos tus informes dan mejor contexto en la consulta. Todo es opcional y puedes cambiarlo cuando quieras en Perfil."
      />
      {form.formError ? <Banner tone="danger" message={form.formError} /> : null}
      {loaded ? <ProfileFields form={form} /> : <AppText muted>Cargando…</AppText>}
    </Screen>
  );
}
