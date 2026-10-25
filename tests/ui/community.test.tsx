import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CommunityScreen from '../../src/app/(tabs)/comunidad';
import ModerationScreen from '../../src/app/comunidad/moderacion';
import NewPostScreen from '../../src/app/comunidad/nuevo';
import { CURRENT_CONSENT_VERSION } from '../../src/domain/catalogs';
import { createLocalAuthService } from '../../src/services/auth/localAuth';
import { configureServices, getCommunity, getRepositories } from '../../src/state/services';
import { useSession } from '../../src/state/sessionStore';
import { resetClock, setClock } from '../../src/utils/clock';
import { NOW } from '../fixtures/factories';
import { createTestDatabase } from '../fixtures/testDatabase';

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    useLocalSearchParams: () => ({}),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const renderScreen = (ui: React.ReactElement) => render(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);

beforeEach(async () => {
  jest.clearAllMocks();
  setClock(() => NOW);
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
  await useSession.getState().signUp({ email: 'ana@ejemplo.com', password: 'cefalea2026', confirmPassword: 'cefalea2026' });
  const repos = await getRepositories();
  await repos.account.recordConsents(useSession.getState().user!.id, [
    { type: 'terms', accepted: true, version: CURRENT_CONSENT_VERSION },
    { type: 'health_data', accepted: true, version: CURRENT_CONSENT_VERSION },
  ]);
});

afterEach(() => resetClock());

describe('comunidad', () => {
  it('pide normas y seudónimo antes de mostrar los foros', async () => {
    await renderScreen(<CommunityScreen />);
    const join = await screen.findByTestId('community-join');
    expect(join.props.accessibilityState.disabled).toBe(true);
    expect(screen.getByText(/no recetes/)).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('community-alias'), 'ana@correo.com');
    await fireEvent.press(screen.getByTestId('community-rules'));
    await fireEvent.press(screen.getByTestId('community-join'));
    expect(await screen.findByText(/Usa letras, números/)).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('community-alias'), 'Luna');
    await fireEvent.press(screen.getByTestId('community-join'));
    expect(await screen.findByText('Participas como Luna.')).toBeTruthy();
    expect(await screen.findByText('Lo que me ayuda cuando empieza el aura')).toBeTruthy();
  });

  it('publica un tema nuevo y lo abre', async () => {
    const userId = useSession.getState().user!.id;
    const community = await getCommunity();
    await community.join(userId, { alias: 'Luna', acceptedRules: true });

    await renderScreen(<NewPostScreen />);
    await fireEvent.press(screen.getByText('Preguntas'));
    await fireEvent.changeText(screen.getByTestId('community-title'), '¿Os pasa con el calor?');
    await fireEvent.changeText(screen.getByTestId('community-body'), 'Este verano tuve más crisis que nunca.');
    await fireEvent.press(screen.getByTestId('community-publish'));

    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    const [mine] = await community.listPosts(userId);
    expect(mine).toMatchObject({ title: '¿Os pasa con el calor?', category: 'questions', authorAlias: 'Luna', mine: true });
  });

  it('quien modera ve lo reportado y lo puede eliminar', async () => {
    const userId = useSession.getState().user!.id;
    const community = await getCommunity();
    await community.join(userId, { alias: 'Luna', acceptedRules: true });
    await community.join('otra', { alias: 'Sol', acceptedRules: true });
    const reported = await community.createPost('otra', { category: 'tips', title: 'Prueba esta pastilla', body: 'Tómate dos al día.' });
    await community.report(userId, { kind: 'post', id: reported.id }, { reason: 'medical_advice' });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find((b) => b.style === 'destructive')?.onPress?.();
    });

    await renderScreen(<ModerationScreen />);
    expect(await screen.findByText('Prueba esta pastilla')).toBeTruthy();
    expect(screen.getByText(/Receta o recomienda medicamentos/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId(`moderation-remove-${reported.id}`));

    expect(await screen.findByText('Nada por revisar')).toBeTruthy();
    expect(alert).toHaveBeenCalledWith('¿Eliminar el tema?', expect.any(String), expect.any(Array));
    expect(await community.moderationQueue(userId)).toEqual([]);
  });
});
