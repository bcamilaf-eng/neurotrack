/** Datos del calendario: marcas del mes visible y registros completos del día elegido. */
import { addDays, endOfMonth, format, startOfMonth } from 'date-fns';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { type DayMark, leadingBlanks, monthMarks } from '../../../domain/analytics/calendar';
import { painDaysBetween } from '../../../domain/analytics/summary';
import type { DailyRecordData, HydrationData, MealData, SleepData } from '../../../domain/entities/habits';
import type { EpisodeRecord } from '../../../data/repositories/episodeRepository';
import type { MedicationRecord } from '../../../data/repositories/habitRepositories';
import type { StoredRecord } from '../../../data/repositories/recordRepository';
import { getRepositories } from '../../../state/services';
import { useSession } from '../../../state/sessionStore';
import { clock } from '../../../utils/clock';

export interface DayRecords {
  date: string;
  episodes: EpisodeRecord[];
  medications: MedicationRecord[];
  sleep: StoredRecord<SleepData> | null;
  hydration: StoredRecord<HydrationData> | null;
  meals: StoredRecord<MealData>[];
  daily: StoredRecord<DailyRecordData> | null;
}

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

export function useCalendar(month: Date, selected: string | null) {
  const user = useSession((s) => s.user);
  const [marks, setMarks] = useState<DayMark[] | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeRecord[]>([]);
  const [day, setDay] = useState<DayRecords | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const now = clock.now();
    const first = ymd(startOfMonth(month));
    const last = ymd(endOfMonth(month));
    const repos = await getRepositories();
    // Una semana antes para incluir episodios que empezaron el mes anterior y siguen en este.
    const [list, medications, daily] = await Promise.all([
      repos.episodes.listBetween(user.id, ymd(addDays(startOfMonth(month), -7)), last),
      repos.medications.listBetween(user.id, first, last),
      repos.daily.listBetween(user.id, first, last),
    ]);
    setEpisodes(list);
    setMarks(
      monthMarks(
        month,
        {
          episodes: list,
          medicationDates: medications.map((m) => m.date),
          painFreeDates: daily.filter((d) => d.painFree).map((d) => d.date),
        },
        now,
      ),
    );
    if (!selected) {
      setDay(null);
      return;
    }
    const [dayMeds, sleep, hydration, meals, dayDaily] = await Promise.all([
      repos.medications.listBetween(user.id, selected, selected),
      repos.sleep.getByDate(user.id, selected),
      repos.hydration.getByDate(user.id, selected),
      repos.meals.listBetween(user.id, selected, selected),
      repos.daily.getByDate(user.id, selected),
    ]);
    setDay({
      date: selected,
      episodes: list.filter((e) => painDaysBetween([e], selected, selected, now).size > 0),
      medications: dayMeds,
      sleep,
      hydration,
      meals,
      daily: dayDaily,
    });
  }, [user, month, selected]);

  useFocusEffect(
    useCallback(() => {
      load()
        .then(() => setError(null))
        .catch(() => setError('No se pudieron cargar tus registros.'));
    }, [load]),
  );

  return { marks, blanks: leadingBlanks(month), episodes, day, error, reload: load };
}
