import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import EpisodeDetailScreen from '../../src/app/episodio/[id]/index';
import NewEpisodeScreen from '../../src/app/episodio/nuevo';
import NewMealScreen from '../../src/app/registro/alimentacion/nueva';
import DailyStateScreen from '../../src/app/registro/estado';
import HydrationScreen from '../../src/app/registro/hidratacion';
import EditMedicationScreen from '../../src/app/registro/medicacion/[id]';
import NewMedicationScreen from '../../src/app/registro/medicacion/nueva';
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

describe('medicación', () => {
  it('valida y guarda una toma vinculada al episodio de la ruta', async () => {
    const episode = await repos.episodes.create(userId, episodeInput({ startedAt: '2026-10-06T09:00:00.000Z', endedAt: undefined, ongoing: true }));
    mockParams.episodio = episode.id;
    await renderScreen(<NewMedicationScreen />);
    expect(screen.getByText(/No recomienda iniciar, suspender ni cambiar/)).toBeTruthy();

    await fireEvent.press(screen.getByTestId('medication-save'));
    expect(await screen.findByText(/Indica la dosis/)).toBeTruthy();
    expect(screen.getByText(/Selecciona la unidad/)).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('medication-name'), 'Ibuprofeno');
    await fireEvent.changeText(screen.getByTestId('medication-dose'), '400');
    await fireEvent.press(screen.getByText('mg'));
    await fireEvent.press(screen.getByText('Alivio parcial'));
    await fireEvent.changeText(screen.getByTestId('medication-relief'), '45');
    await fireEvent.press(screen.getByTestId('medication-save'));
    await waitFor(() => expect(router.back).toHaveBeenCalled());

    const [saved] = await repos.medications.listForEpisode(userId, episode.id);
    expect(saved).toMatchObject({ name: 'Ibuprofeno', doseValue: 400, doseUnit: 'mg', response: 'partial', minutesToRelief: 45, takenAt: NOW.toISOString() });
  });

  it('propone los medicamentos usados antes', async () => {
    await repos.medications.create(userId, { name: 'Paracetamol', doseValue: 1, doseUnit: 'g', takenAt: '2026-10-05T08:00:00.000Z' });
    await renderScreen(<NewMedicationScreen />);
    await fireEvent.press(await screen.findByLabelText('Usar Paracetamol, 1 g'));
    await fireEvent.press(screen.getByTestId('medication-save'));
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(await repos.medications.listRecent(userId)).toHaveLength(2);
  });

  it('permite completar la respuesta de una toma guardada', async () => {
    const taken = await repos.medications.create(userId, { name: 'Naproxeno', doseValue: 550, doseUnit: 'mg', takenAt: '2026-10-06T08:00:00.000Z' });
    mockParams.id = taken.id;
    await renderScreen(<EditMedicationScreen />);
    await fireEvent.press(await screen.findByText('Sin alivio'));
    await fireEvent.press(screen.getByTestId('medication-save'));
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect((await repos.medications.get(userId, taken.id))?.response).toBe('none');
  });

  it('aparece en la línea temporal del episodio', async () => {
    const episode = await repos.episodes.create(userId, episodeInput());
    await repos.medications.create(userId, { name: 'Ibuprofeno', doseValue: 400, doseUnit: 'mg', takenAt: '2026-10-05T18:00:00.000Z', episodeId: episode.id });
    mockParams.id = episode.id;
    await renderScreen(<EpisodeDetailScreen />);
    expect(await screen.findByText('Ibuprofeno 400 mg · Respuesta sin registrar')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('episode-add-medication'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/registro/medicacion/nueva', params: { episodio: episode.id } });
  });

  it('al guardar un episodio nuevo puede abrir el registro de su medicación', async () => {
    mockParams.paso = '4';
    await renderScreen(<NewEpisodeScreen />);
    await fireEvent(screen.getByRole('switch', { name: 'Tomé medicación para este episodio' }), 'valueChange', true);
    await fireEvent.press(screen.getByTestId('episode-save'));
    await fireEvent.press(await screen.findByTestId('pain-6'));
    await fireEvent.press(screen.getByTestId('episode-save'));
    await waitFor(() => expect(router.push).toHaveBeenCalled());
    const [episode] = await repos.episodes.ongoing(userId);
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/episodio/[id]', params: { id: episode.id } });
    expect(router.push).toHaveBeenCalledWith({ pathname: '/registro/medicacion/nueva', params: { episodio: episode.id } });
  });
});

describe('hábitos del día', () => {
  it('guarda el sueño de la noche con las horas calculadas', async () => {
    await renderScreen(<SleepScreen />);
    expect(await screen.findByText('Horas de sueño: 8 h')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('sleep-save'));
    expect(await screen.findByText(/Indica la calidad del sueño/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('sleep-quality-4'));
    await fireEvent.changeText(screen.getByTestId('sleep-awakenings'), '2');
    await fireEvent.press(screen.getByTestId('sleep-save'));
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(await repos.sleep.getByDate(userId, '2026-10-06')).toMatchObject({
      bedtimeAt: '2026-10-05T23:00:00.000Z',
      wakeAt: '2026-10-06T07:00:00.000Z',
      quality: 4,
      awakenings: 2,
    });
  });

  it('carga el registro existente del día para editarlo', async () => {
    await repos.hydration.upsertForDay(userId, { date: '2026-10-06', amountMl: 750, glasses: 3 });
    await renderScreen(<HydrationScreen />);
    expect(await screen.findByText('3 vasos de 250 ml')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('glass-add'));
    expect(screen.getByLabelText('Progreso de hidratación: 50 %, 1 de 2 l')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('hydration-save'));
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(await repos.hydration.getByDate(userId, '2026-10-06')).toMatchObject({ amountMl: 1000, glasses: 4 });
  });

  it('guarda una comida con sus alimentos', async () => {
    await renderScreen(<NewMealScreen />);
    await fireEvent.press(screen.getByText('Almuerzo'));
    await fireEvent.changeText(screen.getByTestId('meal-food-input'), 'Queso, chocolate');
    await fireEvent.press(screen.getByTestId('meal-food-add'));
    expect(screen.getByLabelText('Quitar chocolate')).toBeTruthy();
    // Lo que queda escrito sin añadir también se guarda.
    await fireEvent.changeText(screen.getByTestId('meal-food-input'), 'Vino tinto');
    await fireEvent.press(screen.getByTestId('meal-save'));
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    const [meal] = await repos.meals.listBetween(userId, '2026-10-06', '2026-10-06');
    expect(meal).toMatchObject({ mealType: 'lunch', time: '12:00', foods: ['Queso', 'chocolate', 'Vino tinto'] });
  });

  it('no marca sin dolor un día con episodio y guarda las escalas', async () => {
    await repos.episodes.create(userId, episodeInput({ startedAt: '2026-10-06T08:00:00.000Z', endedAt: '2026-10-06T09:00:00.000Z' }));
    await renderScreen(<DailyStateScreen />);
    expect(await screen.findByText(/no son una medición clínica/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('daily-stress-8'));
    await fireEvent.press(screen.getByTestId('daily-mood-2'));
    await fireEvent(screen.getByRole('switch', { name: 'Día sin dolor' }), 'valueChange', true);
    await fireEvent.press(screen.getByTestId('daily-save'));
    expect(await screen.findByText(/no puede marcarse sin dolor/)).toBeTruthy();
    expect(await repos.daily.getByDate(userId, '2026-10-06')).toBeNull();

    await fireEvent(screen.getByRole('switch', { name: 'Día sin dolor' }), 'valueChange', false);
    await fireEvent.press(screen.getByTestId('daily-save'));
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(await repos.daily.getByDate(userId, '2026-10-06')).toMatchObject({ stress: 8, mood: 2, painFree: false });
  });
});
