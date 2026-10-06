/** Registro: solo email y contraseña (minimización de datos). */
import { router } from 'expo-router';
import { useRef } from 'react';
import type { TextInput } from 'react-native';
import { PASSWORD_MIN_LENGTH } from '../../domain/entities/user';
import { LOCAL_MODE_NOTICE } from '../../i18n/es';
import { useSession } from '../../state/sessionStore';
import { AppText, Banner, Button, Screen, TextField } from '../../ui/components';
import { AuthHeader } from '../../ui/features/auth/AuthHeader';
import { useForm } from '../../ui/hooks/useForm';

export default function SignUpScreen() {
  const { signUp, mode } = useSession();
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const form = useForm({ email: '', password: '', confirmPassword: '' });

  const onSubmit = () =>
    form.submit(async (values) => {
      const { needsEmailConfirmation } = await signUp(values);
      if (needsEmailConfirmation) router.replace({ pathname: '/check-email', params: { email: values.email } });
    });

  return (
    <Screen
      edges={['left', 'right']}
      footer={<Button label="Crear cuenta" onPress={onSubmit} loading={form.submitting} testID="sign-up-submit" />}
    >
      <AuthHeader
        title="Crea tu cuenta"
        subtitle="Solo necesitamos tu email y una contraseña. Todo lo demás es opcional."
      />
      {mode === 'local' ? <Banner tone="info" message={LOCAL_MODE_NOTICE} /> : null}
      {form.formError ? <Banner tone="danger" message={form.formError} /> : null}
      <TextField
        label="Email"
        value={form.values.email}
        onChangeText={(v) => form.setField('email', v)}
        error={form.errors.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="username"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <TextField
        ref={passwordRef}
        label="Contraseña"
        value={form.values.password}
        onChangeText={(v) => form.setField('password', v)}
        error={form.errors.password}
        help={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres, con letras y números.`}
        secureTextEntry
        secureToggle
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
      />
      <TextField
        ref={confirmRef}
        label="Repite la contraseña"
        value={form.values.confirmPassword}
        onChangeText={(v) => form.setField('confirmPassword', v)}
        error={form.errors.confirmPassword}
        secureTextEntry
        secureToggle
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />
      <AppText variant="caption" muted>
        En el siguiente paso podrás leer y aceptar cómo tratamos tus datos de salud antes de registrar nada.
      </AppText>
    </Screen>
  );
}
