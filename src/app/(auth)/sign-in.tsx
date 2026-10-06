/** Inicio de sesión con email y contraseña. */
import { router } from 'expo-router';
import { useRef } from 'react';
import type { TextInput } from 'react-native';
import { useSession } from '../../state/sessionStore';
import { Banner, Button, Screen, TextField } from '../../ui/components';
import { AuthHeader } from '../../ui/features/auth/AuthHeader';
import { useForm } from '../../ui/hooks/useForm';

export default function SignInScreen() {
  const signIn = useSession((s) => s.signIn);
  const passwordRef = useRef<TextInput>(null);
  const form = useForm({ email: '', password: '' });

  const onSubmit = () => form.submit(signIn);

  return (
    <Screen
      edges={['left', 'right']}
      footer={
        <>
          <Button label="Iniciar sesión" onPress={onSubmit} loading={form.submitting} testID="sign-in-submit" />
          <Button label="He olvidado mi contraseña" variant="ghost" onPress={() => router.push('/forgot-password')} />
        </>
      }
    >
      <AuthHeader title="Inicia sesión" subtitle="Accede a tu registro protegido." />
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
        testID="sign-in-email"
      />
      <TextField
        ref={passwordRef}
        label="Contraseña"
        value={form.values.password}
        onChangeText={(v) => form.setField('password', v)}
        error={form.errors.password}
        secureTextEntry
        secureToggle
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
        testID="sign-in-password"
      />
    </Screen>
  );
}
