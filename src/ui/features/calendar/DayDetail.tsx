/**
 * Todo lo registrado un día: episodios, medicación y hábitos. Cada fila abre su registro
 * para verlo, editarlo o eliminarlo; las que faltan se pueden añadir para ese día.
 */
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { router } from 'expo-router';
import { View } from 'react-native';
import { EPISODE_TYPES, labelOf, MEAL_TYPES, MOOD_LABELS, SLEEP_QUALITY_LABELS } from '../../../domain/catalogs';
import { sleepHours } from '../../../domain/entities/habits';
import { formatDuration } from '../../../utils/time';
import { AppText, Card, ListRow } from '../../components';
import { spacing } from '../../theme';
import { medicationSummary, responseSummary } from '../medication/format';
import type { DayRecords } from './useCalendar';

const hour = (iso: string) => format(parseISO(iso), 'HH:mm');

export function DayDetail({ day }: { day: DayRecords }) {
  const { date } = day;
  const nothing =
    !day.episodes.length && !day.medications.length && !day.sleep && !day.hydration && !day.meals.length && !day.daily;
  const open = (pathname: string) => router.push({ pathname, params: { fecha: date } });

  return (
    <Card>
      <AppText variant="heading">{format(parseISO(date), "EEEE d 'de' MMMM", { locale: es })}</AppText>
      {nothing ? <AppText muted>No hay registros este día.</AppText> : null}

      {day.episodes.map((e) => (
        <ListRow
          key={e.id}
          title={`Episodio · ${labelOf(EPISODE_TYPES, e.type)}`}
          subtitle={`Desde ${format(parseISO(e.startedAt), "d MMM HH:mm", { locale: es })} · ${
            e.ongoing ? 'en curso' : e.durationMin !== null ? formatDuration(e.durationMin) : ''
          }`}
          value={`${e.maxIntensity}/10`}
          onPress={() => router.push({ pathname: '/episodio/[id]', params: { id: e.id } })}
        />
      ))}
      {day.medications.map((m) => (
        <ListRow
          key={m.id}
          title={`Medicación · ${medicationSummary(m)}`}
          subtitle={responseSummary(m)}
          value={hour(m.takenAt)}
          onPress={() => router.push({ pathname: '/registro/medicacion/[id]', params: { id: m.id } })}
        />
      ))}
      {day.daily?.painFree ? <AppText>✓ Marcado como día sin dolor</AppText> : null}
      {day.sleep ? (
        <ListRow
          title="Sueño"
          subtitle={`${sleepHours(day.sleep).toLocaleString('es-ES')} h · calidad ${SLEEP_QUALITY_LABELS[day.sleep.quality - 1].toLowerCase()}`}
          onPress={() => open('/registro/sueno')}
        />
      ) : null}
      {day.hydration ? (
        <ListRow
          title="Hidratación"
          subtitle={`${(day.hydration.amountMl / 1000).toLocaleString('es-ES')} l de ${(day.hydration.goalMl / 1000).toLocaleString('es-ES')} l`}
          onPress={() => open('/registro/hidratacion')}
        />
      ) : null}
      {day.meals.length ? (
        <ListRow
          title="Alimentación"
          subtitle={day.meals.map((m) => (m.fasting ? `${labelOf(MEAL_TYPES, m.mealType)}: ayuno` : labelOf(MEAL_TYPES, m.mealType))).join(' · ')}
          onPress={() => open('/registro/alimentacion')}
        />
      ) : null}
      {day.daily ? (
        <ListRow
          title="Estado del día"
          subtitle={[
            day.daily.stress !== undefined ? `estrés ${day.daily.stress}/10` : null,
            day.daily.mood !== undefined ? `ánimo ${MOOD_LABELS[day.daily.mood - 1].toLowerCase()}` : null,
          ]
            .filter(Boolean)
            .join(' · ') || 'Registrado'}
          onPress={() => open('/registro/estado')}
        />
      ) : null}

      <View style={{ gap: spacing.xs }}>
        <AppText variant="label">Añadir a este día</AppText>
        {!day.sleep ? <ListRow title="+ Sueño" onPress={() => open('/registro/sueno')} /> : null}
        {!day.hydration ? <ListRow title="+ Hidratación" onPress={() => open('/registro/hidratacion')} /> : null}
        <ListRow title="+ Comida o ayuno" onPress={() => router.push({ pathname: '/registro/alimentacion/nueva', params: { fecha: date } })} />
        {!day.daily ? <ListRow title="+ Estado del día" onPress={() => open('/registro/estado')} /> : null}
      </View>
    </Card>
  );
}
