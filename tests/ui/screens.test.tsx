import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ConsentScreen from '../../src/app/consent';
import SignInScreen from '../../src/app/(auth)/sign-in';
import InitialProfileScreen from '../../src/app/perfil-inicial';
import { createLocalAuthService } from '../../src/services/auth/localAuth';
import { configureServices, getRepositories } from '../../src/state/services';
import { useSession } from '../../src/state/sessionStore';
import { createTestDatabase } from '../fixtures/testDatabase';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const renderScreen = (ui: React.ReactElement) =>
  render(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);

beforeEach(async () => {
  (SecureStore as unknown as { __reset(): void }).__reset();
  const db = await createTestDatabase();
  configureServices({
    auth: createLocalAuthService(),
    openDatabase: async () => db,
    destroyLocalData: async () => undefined,
    biometrics: { isAvailable: async () => true, authenticate: async () => true },
  });
  useSession.setState({ status: 'initializing', user: null, settings: null });
  await useSession.getState().initialize();
});

describe('pantalla de inicio de sesión', () => {
  it('muestra errores de validación sin llamar al servidor', async () => {
    await renderScreen(<SignInScreen />);
    await fireEvent.changeText(screen.getByTestId('sign-in-email'), 'no-es-un-email');
    await fireEvent.press(screen.getByTestId('sign-in-submit'));
    expect(await screen.findByText(/email válido/)).toBeTruthy();
    expect(screen.getByText(/Introduce tu contraseña/)).toBeTruthy();
  });

  it('muestra un error claro con credenciales incorrectas', async () => {
    await renderScreen(<SignInScreen />);
    await fireEvent.changeText(screen.getByTestId('sign-in-email'), 'ana@ejemplo.com');
    await fireEvent.changeText(screen.getByTestId('sign-in-password'), 'cualquiera123');
    await fireEvent.press(screen.getByTestId('sign-in-submit'));
    expect(await screen.findByText('Email o contraseña incorrectos.')).toBeTruthy();
  });
});

describe('pantalla de consentimiento', () => {
  beforeEach(async () => {
    await useSession.getState().signUp({ email: 'ana@ejemplo.com', password: 'cefalea2026', confirmPassword: 'cefalea2026' });
  });

  it('no permite continuar hasta aceptar los consentimientos obligatorios', async () => {
    await renderScreen(<ConsentScreen />);
    const continueButton = screen.getByTestId('consent-continue');
    expect(continueButton.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByTestId('consent-terms'));
    expect(screen.getByTestId('consent-continue').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByTestId('consent-health_data'));
    expect(screen.getByTestId('consent-continue').props.accessibilityState.disabled).toBe(false);
    await fireEvent.press(screen.getByTestId('consent-continue'));
    await waitFor(() => expect(useSession.getState().status).toBe('needsProfile'));
  });

  it('los consentimientos opcionales empiezan desmarcados', async () => {
    await renderScreen(<ConsentScreen />);
    expect(screen.getByTestId('consent-cloud_sync').props.accessibilityState.checked).toBe(false);
    expect(screen.getByTestId('consent-pattern_analysis').props.accessibilityState.checked).toBe(false);
  });
});

describe('perfil al entrar por primera vez', () => {
  beforeEach(async () => {
    await useSession.getState().signUp({ email: 'ana@ejemplo.com', password: 'cefalea2026', confirmPassword: 'cefalea2026' });
    await useSession.getState().acceptConsents({ terms: true, health_data: true });
  });

  it('guarda fecha de nacimiento, ocupación y diagnósticos y entra en la app', async () => {
    expect(useSession.getState().status).toBe('needsProfile');
    await renderScreen(<InitialProfileScreen />);
    await fireEvent.changeText(await screen.findByTestId('profile-birth-date'), '1990-04-23');
    await fireEvent.changeText(screen.getByTestId('profile-occupation'), 'Enfermera');
    await fireEvent.press(screen.getByTestId('profile-diagnoses-migraine_with_aura'));
    await fireEvent.changeText(screen.getByTestId('profile-other-conditions'), 'Hipotiroidismo');
    await fireEvent.press(screen.getByTestId('profile-initial-save'));
    await waitFor(() => expect(useSession.getState().status).toBe('ready'));

    const repos = await getRepositories();
    expect(await repos.account.getProfile(useSession.getState().user!.id)).toMatchObject({
      birthDate: '1990-04-23',
      occupation: 'Enfermera',
      diagnoses: ['migraine_with_aura'],
      otherConditions: 'Hipotiroidismo',
    });
  });

  it('permite dejarlo para más tarde', async () => {
    await renderScreen(<InitialProfileScreen />);
    await fireEvent.press(await screen.findByTestId('profile-initial-later'));
    await waitFor(() => expect(useSession.getState().status).toBe('ready'));
  });
});
