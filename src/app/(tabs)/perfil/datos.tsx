/**
 * Perfil opcional y contacto de emergencia. Nada es obligatorio: se explica para qué sirve
 * cada dato y se guarda solo lo que el usuario escribe.
 */
import { router } from 'expo-router';
import { AppText, Banner, Button, Screen, useToast } from '../../../ui/components';
import { ProfileFields, useProfileForm } from '../../../ui/features/profile/ProfileForm';

export default function ProfileDataScreen() {
  const { form, loaded, save } = useProfileForm();
  const toast = useToast();

  if (!loaded) return <Screen edges={['left', 'right']}>{null}</Screen>;

  return (
    <Screen
      edges={['left', 'right']}
      footer={
        <Button
          label="Guardar"
          onPress={() =>
            save(() => {
              toast.show('Perfil guardado');
              router.back();
            })
          }
          loading={form.submitting}
        />
      }
    >
      <AppText muted>
        Todos los datos son opcionales. Sirven para dar contexto a tu informe médico y nunca se comparten sin tu acción.
      </AppText>
      {form.formError ? <Banner tone="danger" message={form.formError} /> : null}
      <ProfileFields form={form} />
    </Screen>
  );
}
