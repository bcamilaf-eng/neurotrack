/** Recuperación de contraseña por enlace de un solo uso. */
import { useState } from 'react';
import { emailSchema } from '../../domain/entities/user';
import { parseOrThrow } from '../../domain/errors';
import { getServices } from '../../state/services';
import { AppText, Banner, Button, Screen, TextField } from '../../ui/components';
import { AuthHeader } from '../../ui/features/auth/AuthHeader';
import { useForm } from '../../ui/hooks/useForm';

export default function ForgotPasswordScreen() {
  const form = useForm({ email: '' });
  const [sent, setSent] = useState(false);

  const onSubmit = () =>
    form.submit(async ({ email }) => {
      const parsed = parseOrThrow(emailSchema, email);
      await getServices().auth.requestPasswordReset(parsed);
      setSent(true);
    });

  return (
    <Screen
      edges={['left', 'right']}
      footer={
        sent ? null : <Button label="Enviar enlace" onPress={onSubmit} loading={form.submitting} />
      }
    >
      <AuthHeader title="Recupera tu contraseña" subtitle="Te enviaremos un enlace para crear una nueva." />
      {sent ? (
        <Banner
          tone="info"
          title="Revisa tu email"
          message="Si existe una cuenta con ese email, recibirás un enlace válido durante 1 hora. Ábrelo en este teléfono."
        />
      ) : (
        <>
          {form.formError ? <Banner tone="danger" message={form.formError} /> : null}
          <TextField
            label="Email"
            value={form.values.email}
            onChangeText={(v) => form.setField('email', v)}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            returnKeyType="send"
            onSubmitEditing={onSubmit}
          />
          <AppText variant="caption" muted>
            Por tu privacidad, no confirmamos si un email tiene cuenta.
          </AppText>
        </>
      )}
    </Screen>
  );
}
