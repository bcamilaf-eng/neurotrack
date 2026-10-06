import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import HomeScreen from '../../src/app/(tabs)/index';
import EpisodeDetailScreen from '../../src/app/episodio/[id]/index';
import NewEpisodeScreen from '../../src/app/episodio/nuevo';
import type { SqlDatabase } from '../../src/data/db/types';
import { createRepositories, type Repositories } from '../../src/data/repositories';
import { createLocalAuthService } from '../../src/services/auth/localAuth';
import { configureServices } from '../../src/state/services';
import { useSession } from '../../src/state/sessionStore';
import { resetClock, setClock } from '../../src/utils/clock';
import { episodeInput, NOW } from '../fixtures/factories';
import { createTestDatabase } from '../fixtures/testDatabase';

const mockParams: Record<string, string> = {};

jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    useLocalSearchParams: () => mockParams,
    useNavigation: () => ({ addListener: () => () => undefined, dispatch: jest.fn() }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const renderScreen = (ui: React.ReactElement) => render(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);

let repos: Repositories;
let userId: string;

/** Pulsa el botón del diálogo nativo cuyo texto coincide. */
function answerAlert(buttonText: string) {
  const spy = Alert.alert as jest.Mock;
  const buttons = spy.mock.calls.at(-1)?.[2] as { text: string; onPress?: () => void }[];
  buttons.find((b) => b.text === buttonText)?.onPress?.();
}

beforeEach(async () => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  for (const key of Object.keys(mockParams)) delete mockParams[key];
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

describe('registro de episodio', () => {
  it('pide la intensidad y guarda el episodio en curso', async () => {
    await renderScreen(<NewEpisodeScreen />);
    await fireEvent.press(screen.getByTestId('episode-save'));
    expect(await screen.findByText(/Indica la intensidad del dolor/)).toBeTruthy();

    await fireEvent.press(screen.getByTestId('pain-7'));
    await fireEvent.press(screen.getByTestId('episode-save'));
    await waitFor(() => expect(router.replace).toHaveBeenCalled());

    const [saved] = await repos.episodes.ongoing(userId);
    expect(saved).toMatchObject({ intensity: 7, ongoing: true, startedAt: NOW.toISOString() });
  });

  it('guarda síntomas y desencadenantes elegidos en sus pasos', async () => {
    mockParams.paso = '2';
    await renderScreen(<NewEpisodeScreen />);
    await fireEvent.press(screen.getByText('Náuseas'));
    await fireEvent.press(screen.getByTestId('episode-next'));
    await fireEvent.press(screen.getByText('No identificado'));
    await fireEvent.press(screen.getByTestId('episode-save'));
    // Falta la intensidad: vuelve al primer paso.
    expect(await screen.findByText('Cuándo y cuánto')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('pain-4'));
    await fireEvent.press(screen.getByTestId('episode-save'));
    await waitFor(() => expect(router.replace).toHaveBeenCalled());

    const [saved] = await repos.episodes.ongoing(userId);
    expect(saved.symptoms.map((s) => s.type)).toEqual(['nausea']);
    expect(saved.triggers.map((t) => t.type)).toEqual(['unidentified']);
  });

  it('avisa de un posible duplicado y permite guardarlo igualmente', async () => {
    await repos.episodes.create(userId, episodeInput({ startedAt: '2026-10-06T11:00:00.000Z', endedAt: undefined, ongoing: true }));
    await renderScreen(<NewEpisodeScreen />);
    await fireEvent.press(screen.getByTestId('pain-5'));
    // El diálogo deja la acción pendiente hasta que se responde.
    const pressed = fireEvent.press(screen.getByTestId('episode-save'));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Posible registro duplicado', expect.any(String), expect.any(Array)));
    expect(await repos.episodes.ongoing(userId)).toHaveLength(1);

    answerAlert('Guardar igualmente');
    await pressed;
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(await repos.episodes.ongoing(userId)).toHaveLength(2);
  });
});

describe('detalle del episodio', () => {
  it('anota la evolución y cierra un episodio en curso', async () => {
    const episode = await repos.episodes.create(
      userId,
      episodeInput({ startedAt: '2026-10-06T10:00:00.000Z', endedAt: undefined, ongoing: true, intensity: 5 }),
    );
    mockParams.id = episode.id;
    await renderScreen(<EpisodeDetailScreen />);
    expect(await screen.findByText('5/10')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('pain-9'));
    await fireEvent.press(screen.getByTestId('add-pain'));
    expect(await screen.findByText('9/10')).toBeTruthy();
    expect(screen.getByText('Cambio de intensidad · 9/10')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('close-episode'));
    await waitFor(async () => expect((await repos.episodes.get(userId, episode.id))?.ongoing).toBe(false));
    const closed = await repos.episodes.get(userId, episode.id);
    expect(closed).toMatchObject({ endedAt: NOW.toISOString(), durationMin: 120, maxIntensity: 9 });
  });

  it('elimina el episodio solo tras confirmar', async () => {
    const episode = await repos.episodes.create(userId, episodeInput());
    mockParams.id = episode.id;
    await renderScreen(<EpisodeDetailScreen />);
    await screen.findByText('8/10');
    let pressed = fireEvent.press(screen.getByText('Eliminar episodio'));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(1));
    answerAlert('Cancelar');
    await pressed;
    expect(await repos.episodes.get(userId, episode.id)).not.toBeNull();

    pressed = fireEvent.press(screen.getByText('Eliminar episodio'));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(2));
    answerAlert('Eliminar episodio');
    await pressed;
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(await repos.episodes.get(userId, episode.id)).toBeNull();
  });
});

describe('inicio', () => {
  it('resume el mes con los episodios registrados', async () => {
    await repos.episodes.create(userId, episodeInput({ intensity: 8 }));
    await repos.episodes.create(
      userId,
      episodeInput({ startedAt: '2026-10-02T08:00:00.000Z', endedAt: '2026-10-02T10:00:00.000Z', intensity: 5 }),
    );
    await renderScreen(<HomeScreen />);
    expect(await screen.findByLabelText('Episodios: 2')).toBeTruthy();
    expect(screen.getByLabelText('Días con dolor: 2')).toBeTruthy();
    expect(screen.getByLabelText('Intensidad promedio: 6,5/10')).toBeTruthy();
    expect(screen.getByLabelText('Duración promedio: 3 h')).toBeTruthy();
    expect(screen.getByText('Han pasado 1 día desde tu último episodio.')).toBeTruthy();
  });

  it('registra un día sin dolor', async () => {
    await renderScreen(<HomeScreen />);
    await fireEvent.press(await screen.findByTestId('quick-pain-free'));
    expect(await screen.findByText('Registraste hoy como un día sin dolor.')).toBeTruthy();
    expect((await repos.daily.getByDate(userId, '2026-10-06'))?.painFree).toBe(true);
  });
});
