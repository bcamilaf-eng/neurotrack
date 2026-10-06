/**
 * Destino del enlace de recuperación (`neurotrack://reset-password#access_token=…`).
 * Abre una sesión temporal con el enlace y permite fijar una contraseña nueva.
 */
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { passwordSchema } from '../domain/entities/user';
import { parseOrThrow, ValidationError } from '../domain/errors';
import { getServices } from '../state/services';
import { useSession } from '../state/sessionStore';
import { AppText, Banner, Button, Screen, TextField } from '../ui/components';
import { AuthHeader } from '../ui/features/auth/AuthHeader';
import { useForm } from '../ui/hooks/useForm';

type Phase = 'checking' | 'ready' | 'invalid' | 'done';

export default function ResetPasswordScreen() {
  const url = Linking.useLinkingURL();
  const [linkPhase, setPhase] = useState<Phase>('checking');
  // Sin enlace no hay nada que comprobar.
  const phase: Phase = url ? linkPhase : 'invalid';
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm({ password: '', confirmPassword: '' });
  const initialize = useSession((s) => s.initialize);

  useEffect(() => {
    if (!url) return;
    getServices()
      .auth.completePasswordRecovery(url)
      .then(() => setPhase('ready'))
      .catch((error: Error) => {
        setMessage(error.message);
        setPhase('invalid');
      });
  }, [url]);

  const onSubmit = () =>
    form.submit(async ({ password, confirmPassword }) => {
      parseOrThrow(passwordSchema, password);
      if (password !== confirmPassword) {
        throw new ValidationError({ confirmPassword: 'Las contraseñas no coinciden.' });
      }
      await getServices().auth.updatePassword(password);
      setPhase('done');
    });

  const finish = async () => {
    await initialize().catch(() => undefined);
    router.replace('/');
  };

  return (
    <Screen
      footer={
        phase === 'ready' ? (
          <Button label="Guardar contraseña" onPress={onSubmit} loading={form.submitting} />
        ) : phase === 'checking' ? null : (
          <Button label="Continuar" onPress={finish} />
        )
      }
    >
      <AuthHeader title="Nueva contraseña" />
      {phase === 'checking' ? <AppText muted>Comprobando el enlace…</AppText> : null}
      {phase === 'invalid' ? <Banner tone="danger" message={message ?? 'El enlace no es válido.'} /> : null}
      {phase === 'done' ? <Banner tone="info" message="Tu contraseña se actualizó correctamente." /> : null}
      {phase === 'ready' ? (
        <>
          {form.formError ? <Banner tone="danger" message={form.formError} /> : null}
          <TextField
            label="Contraseña nueva"
            value={form.values.password}
            onChangeText={(v) => form.setField('password', v)}
            secureTextEntry
            secureToggle
            autoComplete="new-password"
          />
          <TextField
            label="Repite la contraseña"
            value={form.values.confirmPassword}
            onChangeText={(v) => form.setField('confirmPassword', v)}
            error={form.errors.confirmPassword}
            secureTextEntry
            secureToggle
            autoComplete="new-password"
          />
        </>
      ) : null}
    </Screen>
  );
}
