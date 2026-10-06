import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { router } from 'expo-router';
import EvolutionScreen from '../../src/app/(tabs)/evolucion';
import RemindersScreen from '../../src/app/(tabs)/perfil/recordatorios';
import EpisodeDetailScreen from '../../src/app/episodio/[id]/index';
import NewEpisodeScreen from '../../src/app/episodio/nuevo';
import ReportScreen from '../../src/app/informe';
import type { SqlDatabase } from '../../src/data/db/types';
import { createRepositories, type Repositories } from '../../src/data/repositories';
import { ALARM_MESSAGE } from '../../src/domain/alerts/rules';
import { defaultReminders } from '../../src/domain/reminders';
import { createLocalAuthService } from '../../src/services/auth/localAuth';
import { configureServices } from '../../src/state/services';
import { useSession } from '../../src/state/sessionStore';
import { resetClock, setClock } from '../../src/utils/clock';
import { episodeInput, NOW } from '../fixtures/factories';
import { createTestDatabase } from '../fixtures/testDatabase';

const mockParams: Record<string, string> = {};

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    useLocalSearchParams: () => mockParams,
    useNavigation: () => ({ addListener: () => () => undefined, dispatch: jest.fn() }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

const files = (FileSystem as unknown as { __files: Map<string, string> }).__files;
const shared = (Sharing as unknown as { __shared: { uri: string; content?: string; options: { mimeType: string } }[] }).__shared;
const scheduled = (Notifications as unknown as { __scheduled: { identifier: string; content: { title: string; body: string }; trigger: { type: string; hour: number; minute: number } }[] }).__scheduled;
const permission = (Notifications as unknown as { __permission: { granted: boolean; canAskAgain: boolean } }).__permission;

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const renderScreen = (ui: React.ReactElement) => render(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);

let repos: Repositories;
let userId: string;

beforeEach(async () => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  for (const key of Object.keys(mockParams)) delete mockParams[key];
  files.clear();
  shared.length = 0;
  scheduled.length = 0;
  permission.granted = true;
  permission.canAskAgain = true;
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
  await useSession.getState().signUp({ email: 'ana@ejemplo.com', password: 'cefalea2026', confirmPassword: 'cefalea2026' });
  await useSession.getState().acceptConsents({});
  userId = useSession.getState().user!.id;
});

afterEach(() => resetClock());

describe('señales de alarma', () => {
  it('el formulario pregunta por el inicio súbito y, con señal, no abre la medicación', async () => {
    await renderScreen(<NewEpisodeScreen />);
    await fireEvent.press(screen.getByTestId('pain-9'));
    await fireEvent.press(screen.getByTestId('episode-sudden-onset'));
    await fireEvent.press(screen.getByTestId('episode-save'));
    await waitFor(() => expect(router.replace).toHaveBeenCalled());

    const [episode] = await repos.episodes.listBetween(userId, '2026-10-06', '2026-10-06');
    expect(episode.suddenOnset).toBe(true);
    expect((await repos.alarms.listForEpisode(userId, episode.id)).map((f) => f.signal)).toEqual(['sudden_severe']);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('el detalle muestra el aviso exacto, permite llamar y reconocerlo', async () => {
    await repos.account.saveEmergencyContact(userId, { name: 'Luis', phone: '+34 600 11 22 33' });
    const episode = await repos.episodes.create(userId, episodeInput({ symptoms: [{ type: 'seizure' }] }));
    mockParams.id = episode.id;
    await renderScreen(<EpisodeDetailScreen />);

    expect(await screen.findByText(ALARM_MESSAGE)).toBeTruthy();
    expect(screen.getByText('• Convulsiones')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('alarm-call-emergency'));
    expect(Linking.openURL).toHaveBeenCalledWith('tel:112');
    await fireEvent.press(screen.getByTestId('alarm-call-contact'));
    expect(Linking.openURL).toHaveBeenCalledWith('tel:+34600112233');

    await fireEvent.press(screen.getByTestId('alarm-acknowledge'));
    await waitFor(() => expect(screen.queryByTestId('alarm-acknowledge')).toBeNull());
    const [flag] = await repos.alarms.listForEpisode(userId, episode.id);
    expect(flag.shownAt).toBeDefined();
    expect(flag.acknowledgedAt).toBeDefined();
    // Reconocida, la señal sigue visible en el detalle.
    expect(screen.getByText(ALARM_MESSAGE)).toBeTruthy();
  });
});

describe('informe para la consulta', () => {
  it('se abre desde «Mi evolución»', async () => {
    await renderScreen(<EvolutionScreen />);
    await fireEvent.press(await screen.findByTestId('open-report'));
    expect(router.push).toHaveBeenCalledWith('/informe');
  });

  it('muestra la vista previa y comparte el PDF, que luego se borra', async () => {
    await repos.episodes.create(userId, episodeInput());
    await renderScreen(<ReportScreen />);
    expect(await screen.findByText(/Episodios \(1\)/)).toBeTruthy();

    await fireEvent.press(screen.getByTestId('report-pdf'));
    expect(await screen.findByText(/El archivo temporal se borró/)).toBeTruthy();
    expect(shared).toHaveLength(1);
    expect(shared[0].uri).toBe('file:///cache/exportaciones/neurotrack-informe-2026-09-07_2026-10-06.pdf');
    expect(shared[0].options.mimeType).toBe('application/pdf');
    expect(shared[0].content).toContain('Informe de cefaleas y migrañas registradas');
    expect([...files.keys()]).toEqual([]);
  });

  it('exporta CSV y valida el período personalizado', async () => {
    await repos.episodes.create(userId, episodeInput());
    await renderScreen(<ReportScreen />);
    await fireEvent.press(await screen.findByTestId('report-csv'));
    await waitFor(() => expect(shared).toHaveLength(1));
    expect(shared[0].uri).toMatch(/\.csv$/);
    expect(shared[0].content).toContain('Fecha;Hora;Duración;Intensidad');
    expect([...files.keys()]).toEqual([]);

    await fireEvent.press(screen.getByText('Personalizado'));
    expect(await screen.findByText(/Episodios \(1\)/)).toBeTruthy();
  });
});

describe('recordatorios', () => {
  it('activa uno con texto genérico y lo cancela al desactivarlo', async () => {
    await renderScreen(<RemindersScreen />);
    const hydration = screen.getByLabelText('Hidratación');
    await fireEvent(hydration, 'valueChange', true);
    await waitFor(() => expect(scheduled).toHaveLength(1));
    expect(scheduled[0].content).toEqual({ title: 'NeuroTrack', body: 'Tienes un registro pendiente' });
    expect(scheduled[0].trigger).toMatchObject({ type: 'daily', hour: 13, minute: 0 });
    expect(useSession.getState().settings?.reminders).toMatchObject({ hydration: { enabled: true, time: '13:00' } });

    await fireEvent(screen.getByLabelText('Hidratación'), 'valueChange', false);
    await waitFor(() => expect(scheduled).toHaveLength(0));
  });

  it('si el permiso está denegado, avisa y no programa nada', async () => {
    permission.granted = false;
    permission.canAskAgain = false;
    await renderScreen(<RemindersScreen />);
    await fireEvent(screen.getByLabelText('Seguimiento semanal'), 'valueChange', true);
    expect(await screen.findByText(/Las notificaciones están desactivadas/)).toBeTruthy();
    expect(scheduled).toHaveLength(0);
  });

  it('cerrar sesión cancela los recordatorios', async () => {
    await useSession.getState().saveReminders({
      ...defaultReminders(),
      daily: { enabled: true, time: '21:30' },
    });
    expect(scheduled).toHaveLength(1);
    await useSession.getState().signOut();
    expect(scheduled).toHaveLength(0);
  });
});
