/**
 * Recorrido completo de una persona usuaria, pantalla a pantalla, sobre la base real en
 * memoria: alta, registro, edición, informe, privacidad y baja.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { router } from 'expo-router';
import CalendarScreen from '../../src/app/(tabs)/calendario';
import AppearanceScreen from '../../src/app/(tabs)/perfil/apariencia';
import PrivacyPolicyScreen from '../../src/app/(tabs)/perfil/politica';
import PrivacyScreen from '../../src/app/(tabs)/perfil/privacidad';
import TermsScreen from '../../src/app/(tabs)/perfil/terminos';
import EditEpisodeScreen from '../../src/app/episodio/[id]/editar';
import NewEpisodeScreen from '../../src/app/episodio/nuevo';
import ReportScreen from '../../src/app/informe';
import type { SqlDatabase } from '../../src/data/db/types';
import { createRepositories, type Repositories } from '../../src/data/repositories';
import { createLocalAuthService } from '../../src/services/auth/localAuth';
import { configureServices } from '../../src/state/services';
import { useSession } from '../../src/state/sessionStore';
import { AppText } from '../../src/ui/components';
import { ThemeProvider } from '../../src/ui/theme/ThemeContext';
import { resetClock, setClock } from '../../src/utils/clock';
import { NOW } from '../fixtures/factories';
import { createTestDatabase } from '../fixtures/testDatabase';

const mockParams: Record<string, string> = {};

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn() },
    useLocalSearchParams: () => mockParams,
    useNavigation: () => ({ addListener: () => () => undefined, dispatch: jest.fn() }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

const files = (FileSystem as unknown as { __files: Map<string, string> }).__files;
const shared = (Sharing as unknown as { __shared: { uri: string; content?: string }[] }).__shared;

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const renderScreen = (ui: React.ReactElement) => render(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);

function answerAlert(buttonText: string) {
  const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2] as { text: string; onPress?: () => void }[];
  buttons.find((b) => b.text === buttonText)?.onPress?.();
}

let repos: Repositories;

beforeEach(async () => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  for (const key of Object.keys(mockParams)) delete mockParams[key];
  files.clear();
  shared.length = 0;
  setClock(() => NOW);
  (SecureStore as unknown as { __reset(): void }).__reset();
  const db: SqlDatabase = await createTestDatabase();
  repos = createRepositories(db);
  configureServices({
    auth: createLocalAuthService(),
    openDatabase: async () => db,
    destroyLocalData: async () => undefined,
    biometrics: { isAvailable: async () => true, authenticate: async () => true },
  });
  useSession.setState({ status: 'initializing', user: null, settings: null });
  await useSession.getState().initialize();
});

afterEach(() => resetClock());

describe('recorrido completo', () => {
  it('alta → episodio → edición → calendario → informe → exportar datos → borrar registros → baja', async () => {
    // Alta y consentimiento.
    await useSession.getState().signUp({ email: 'ana@ejemplo.com', password: 'cefalea2026', confirmPassword: 'cefalea2026' });
    expect(useSession.getState().status).toBe('needsConsent');
    await useSession.getState().acceptConsents({ terms: true, health_data: true });
    expect(useSession.getState().status).toBe('ready');
    const userId = useSession.getState().user!.id;

    // Registrar un episodio con síntomas.
    const form = await renderScreen(<NewEpisodeScreen />);
    await fireEvent.press(screen.getByTestId('pain-6'));
    await fireEvent.press(screen.getByTestId('episode-next'));
    await fireEvent.press(screen.getByTestId('episode-next'));
    await fireEvent.press(screen.getByText('Náuseas'));
    await fireEvent.press(screen.getByTestId('episode-save'));
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    await form.unmount();
    const [episode] = await repos.episodes.listBetween(userId, '2026-10-06', '2026-10-06');
    expect(episode).toMatchObject({ intensity: 6, ongoing: true, symptoms: [{ type: 'nausea' }] });

    // Editarlo: subir la intensidad.
    mockParams.id = episode.id;
    const edit = await renderScreen(<EditEpisodeScreen />);
    await fireEvent.press(await screen.findByTestId('pain-8'));
    await fireEvent.press(screen.getByTestId('episode-save'));
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    await edit.unmount();
    expect(await repos.episodes.get(userId, episode.id)).toMatchObject({ intensity: 8, maxIntensity: 8 });

    // El calendario muestra el día como episodio intenso.
    const calendar = await renderScreen(<CalendarScreen />);
    expect(await screen.findByLabelText(/6 de octubre.*Episodio intenso/i)).toBeTruthy();
    await calendar.unmount();

    // Informe en PDF.
    const report = await renderScreen(<ReportScreen />);
    await fireEvent.press(await screen.findByTestId('report-pdf'));
    await waitFor(() => expect(shared).toHaveLength(1));
    expect(shared[0].content).toContain('Náuseas');
    await report.unmount();

    // Copia completa de los datos.
    await renderScreen(<PrivacyScreen />);
    await fireEvent.press(screen.getByTestId('export-all'));
    await waitFor(() => expect(shared).toHaveLength(2));
    expect(shared[1].uri).toMatch(/neurotrack-datos-2026-10-06\.json$/);
    expect(JSON.parse(shared[1].content!).tables.headache_episodes).toHaveLength(1);
    expect([...files.keys()]).toEqual([]);

    // Borrar registros, conservando la cuenta.
    const pressed = fireEvent.press(screen.getByTestId('delete-records'));
    answerAlert('Borrar registros');
    await pressed;
    expect(await screen.findByText('Se borraron todos tus registros.')).toBeTruthy();
    expect(await repos.episodes.listBetween(userId, '2026-01-01', '2026-12-31')).toEqual([]);
    expect(useSession.getState().status).toBe('ready');

    // Baja.
    await act(() => useSession.getState().deleteAccount());
    expect(useSession.getState().status).toBe('signedOut');
    expect(await repos.account.getProfile(userId)).toBeNull();
  });
});

describe('ajustes y textos legales', () => {
  beforeEach(async () => {
    await useSession.getState().signUp({ email: 'ana@ejemplo.com', password: 'cefalea2026', confirmPassword: 'cefalea2026' });
    await useSession.getState().acceptConsents({ terms: true, health_data: true });
  });

  it('cambia el tema y el tamaño de texto', async () => {
    await renderScreen(<AppearanceScreen />);
    await fireEvent.press(screen.getByText('Oscuro'));
    await fireEvent.press(screen.getByText('Muy grande'));
    await waitFor(() => expect(useSession.getState().settings).toMatchObject({ theme: 'dark', textScale: 1.3 }));
  });

  it('el tamaño de texto escala la tipografía', async () => {
    await render(
      <ThemeProvider textScale={1.3}>
        <AppText testID="t">Hola</AppText>
      </ThemeProvider>,
    );
    const style = [screen.getByTestId('t').props.style].flat(3);
    expect(style.find((s: { fontSize?: number }) => s?.fontSize)?.fontSize).toBeCloseTo(16 * 1.3);
  });

  it('muestra la política de privacidad y los términos completos', async () => {
    const policy = await renderScreen(<PrivacyPolicyScreen />);
    expect(screen.getByText('Tus derechos')).toBeTruthy();
    expect(screen.getByText(/Borrador pendiente de revisión legal/)).toBeTruthy();
    await policy.unmount();
    await renderScreen(<TermsScreen />);
    expect(screen.getByText(/No es un dispositivo médico/)).toBeTruthy();
  });
});
