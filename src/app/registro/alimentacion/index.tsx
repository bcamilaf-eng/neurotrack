/** Comidas y ayunos de un día. */
import { addDays, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { labelOf, MEAL_TYPES } from '../../../domain/catalogs';
import type { MealData } from '../../../domain/entities/habits';
import type { StoredRecord } from '../../../data/repositories/recordRepository';
import { FOOD_NOTICE } from '../../../i18n/es';
import { getRepositories } from '../../../state/services';
import { useSession } from '../../../state/sessionStore';
import { AppText, Banner, Button, Card, ListRow, Screen } from '../../../ui/components';
import { useDayParam } from '../../../ui/hooks/useDayParam';
import { spacing } from '../../../ui/theme';
import { clock } from '../../../utils/clock';
import { toLocalDate } from '../../../utils/time';

const mealSubtitle = (m: MealData) =>
  m.fasting ? `Ayuno de ${String(m.fastingHours ?? 0).replace('.', ',')} h` : m.foods.length ? m.foods.join(', ') : 'Sin alimentos anotados';

export default function MealsScreen() {
  const user = useSession((s) => s.user);
  const initialDay = useDayParam();
  const [day, setDay] = useState(initialDay);
  const [meals, setMeals] = useState<StoredRecord<MealData>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const today = toLocalDate(clock.now());

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      setError(null);
      getRepositories()
        .then((repos) => repos.meals.listBetween(user.id, day, day))
        .then(setMeals)
        .catch(() => setError('No se pudieron cargar tus comidas.'));
    }, [user, day]),
  );

  const move = (delta: number) => setDay(format(addDays(parseISO(day), delta), 'yyyy-MM-dd'));

  return (
    <Screen edges={['left', 'right']}>
      <View style={styles.dayRow}>
        <View style={styles.flex}>
          <Button label="‹ Anterior" variant="ghost" onPress={() => move(-1)} hint="Día anterior" />
        </View>
        <AppText variant="label" style={styles.dayLabel}>
          {day === today ? 'Hoy' : format(parseISO(day), "EEE d 'de' MMM", { locale: es })}
        </AppText>
        <View style={styles.flex}>
          <Button label="Siguiente ›" variant="ghost" onPress={() => move(1)} disabled={day >= today} hint="Día siguiente" />
        </View>
      </View>
      <Button label="+ Añadir comida o ayuno" onPress={() => router.push({ pathname: '/registro/alimentacion/nueva', params: { fecha: day } })} testID="meal-new" />
      {error ? <Banner tone="danger" message={error} /> : null}
      {meals && meals.length === 0 ? <AppText muted>No hay comidas anotadas este día.</AppText> : null}
      {meals && meals.length > 0 ? (
        <Card>
          {meals.map((m) => (
            <ListRow
              key={m.id}
              title={labelOf(MEAL_TYPES, m.mealType)}
              subtitle={mealSubtitle(m)}
              value={m.time}
              onPress={() => router.push({ pathname: '/registro/alimentacion/[id]', params: { id: m.id } })}
            />
          ))}
        </Card>
      ) : null}
      <AppText variant="caption" muted>
        {FOOD_NOTICE}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  dayLabel: { textAlign: 'center', flex: 1 },
});
