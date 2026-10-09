import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import CalendarScreen from '../../src/app/(tabs)/calendario';
import EvolutionScreen from '../../src/app/(tabs)/evolucion';
import SleepScreen from '../../src/app/registro/sueno';
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
  const { useEffect } = jest.requireActual('react');
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

function answerAlert(buttonText: string) {
  const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2] as { text: string; onPress?: () => void }[];
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

describe('calendario', () => {
  it('marca los días y muestra el detalle del día elegido', async () => {
    const episode = await repos.episodes.create(userId, episodeInput()); // 5 de octubre, migraña 8/10
    await repos.episodes.create(userId, episodeInput({ startedAt: '2026-10-02T09:00:00.000Z', endedAt: '2026-10-02T10:00:00.000Z', type: 'tension', intensity: 4 }));
    await repos.medications.create(userId, { name: 'Ibuprofeno', doseValue: 400, doseUnit: 'mg', takenAt: '2026-10-05T18:00:00.000Z', episodeId: episode.id });
    await repos.daily.upsertForDay(userId, { date: '2026-10-03', painFree: true });
    await renderScreen(<CalendarScreen />);

    expect(await screen.findByLabelText(/^lunes 5 de octubre, Episodio intenso, intensidad máxima 8 de 10, medicación registrada$/)).toBeTruthy();
    expect(screen.getByLabelText(/^viernes 2 de octubre, Cefalea, intensidad máxima 4 de 10$/)).toBeTruthy();
    expect(screen.getByLabelText(/^sábado 3 de octubre, Sin síntomas$/)).toBeTruthy();
    expect(screen.getByText('2 días con dolor · 1 marcados sin síntomas · 1 con medicación')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('day-2026-10-05'));
    expect(await screen.findByText('Medicación · Ibuprofeno 400 mg')).toBeTruthy();
    await fireEvent.press(screen.getByText('Episodio · Migraña'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/episodio/[id]', params: { id: episode.id } });
  });

  it('cambia de mes y no deja abrir días futuros', async () => {
    await renderScreen(<CalendarScreen />);
    expect(await screen.findByText('Octubre de 2026')).toBeTruthy();
    expect(screen.getByTestId('day-2026-10-07').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByTestId('month-prev'));
    expect(await screen.findByText('Septiembre de 2026')).toBeTruthy();
    expect(screen.getByText('Toca un día para ver lo que registraste.')).toBeTruthy();
  });
});

describe('mi evolución', () => {
  it('muestra el resumen del período y la respuesta a la medicación', async () => {
    await repos.episodes.create(userId, episodeInput({ intensity: 8 }));
    await repos.episodes.create(userId, episodeInput({ startedAt: '2026-09-20T09:00:00.000Z', endedAt: '2026-09-20T11:00:00.000Z', intensity: 4 }));
    await repos.medications.create(userId, { name: 'Ibuprofeno', doseValue: 400, doseUnit: 'mg', takenAt: '2026-10-05T18:00:00.000Z', response: 'complete', minutesToRelief: 40 });
    await renderScreen(<EvolutionScreen />);

    expect(await screen.findByLabelText('Episodios: 2')).toBeTruthy();
    expect(screen.getByLabelText('Intensidad promedio: 6/10')).toBeTruthy();
    expect(screen.getByLabelText('Días sin dolor registrado: 28')).toBeTruthy();
    expect(screen.getByText(/alivio completo 100 %/)).toBeTruthy();
    expect(screen.getByText('Con alivio en 1 de 1 tomas con respuesta registrada')).toBeTruthy();

    await fireEvent.press(screen.getByText('7 días'));
    expect(await screen.findByLabelText('Episodios: 1')).toBeTruthy();
  });

  it('pide permiso antes de analizar patrones y avisa si faltan datos', async () => {
    await repos.episodes.create(userId, episodeInput());
    await renderScreen(<EvolutionScreen />);
    await fireEvent.press(await screen.findByTestId('enable-patterns'));
    expect(await screen.findByText('Datos insuficientes para buscar asociaciones')).toBeTruthy();
    expect(screen.getByText(/Durante el período seleccionado se registró 1 episodio\./)).toBeTruthy();
    expect(screen.getByText(/no demuestra que un factor cause los episodios/)).toBeTruthy();
    expect((await repos.account.currentConsents(userId)).pattern_analysis?.accepted).toBe(true);
  });

  it('presenta una asociación con sus números y su etiqueta', async () => {
    await repos.account.recordConsents(userId, [{ type: 'pattern_analysis', accepted: true, version: '2026-10-06' }]);
    for (let i = 1; i <= 20; i += 1) {
      const date = `2026-09-${String(10 + i).padStart(2, '0')}`;
      const short = i <= 6;
      await repos.sleep.create(userId, {
        date,
        bedtimeAt: short ? `${date}T02:00:00.000Z` : `2026-09-${String(9 + i).padStart(2, '0')}T23:00:00.000Z`,
        wakeAt: `${date}T07:00:00.000Z`,
        quality: 3,
      });
      if (i <= 5 || (i >= 15 && i <= 17)) {
        await repos.episodes.create(userId, episodeInput({ startedAt: `${date}T10:00:00.000Z`, endedAt: `${date}T12:00:00.000Z` }));
      }
    }
    await renderScreen(<EvolutionScreen />);
    const card = await screen.findByText(/después de noches con menos de 6 h de sueño/);
    expect(card.props.children).toBe(
      'Los episodios registrados aparecen con mayor frecuencia después de noches con menos de 6 h de sueño: 83 % de esos días (5 de 6), frente al 21 % (3 de 14) en el resto.',
    );
    expect(screen.getAllByText('Asociación estadística').length).toBeGreaterThan(0);
  });
});

describe('registros del día', () => {
  it('se pueden eliminar tras confirmar', async () => {
    await repos.sleep.create(userId, { date: '2026-10-06', bedtimeAt: '2026-10-05T23:00:00.000Z', wakeAt: '2026-10-06T07:00:00.000Z', quality: 3 });
    await renderScreen(<SleepScreen />);
    const pressed = fireEvent.press(await screen.findByText('Eliminar registro'));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    answerAlert('Eliminar');
    await pressed;
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(await repos.sleep.getByDate(userId, '2026-10-06')).toBeNull();
  });
});

