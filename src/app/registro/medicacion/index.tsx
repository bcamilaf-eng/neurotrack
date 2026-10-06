/** Últimas tomas registradas, agrupadas por día. Tocar una toma permite completarla o corregirla. */
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import type { MedicationRecord } from '../../../data/repositories/habitRepositories';
import { MEDICATION_NOTICE } from '../../../i18n/es';
import { getRepositories } from '../../../state/services';
import { useSession } from '../../../state/sessionStore';
import { AppText, Banner, Button, Card, ListRow, Screen } from '../../../ui/components';
import { medicationSummary, responseSummary } from '../../../ui/features/medication/format';

export default function MedicationListScreen() {
  const user = useSession((s) => s.user);
  const [items, setItems] = useState<MedicationRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      getRepositories()
        .then((repos) => repos.medications.listRecent(user.id))
        .then(setItems)
        .catch(() => setError('No se pudieron cargar tus tomas.'));
    }, [user]),
  );

  const days = new Map<string, MedicationRecord[]>();
  for (const item of items ?? []) days.set(item.date, [...(days.get(item.date) ?? []), item]);

  return (
    <Screen edges={['left', 'right']}>
      <Button label="+ Registrar medicación" onPress={() => router.push('/registro/medicacion/nueva')} testID="medication-new" />
      {error ? <Banner tone="danger" message={error} /> : null}
      {items && items.length === 0 ? (
        <AppText muted>Aún no has registrado ninguna toma.</AppText>
      ) : null}
      {[...days.entries()].map(([day, list]) => (
        <View key={day}>
          <AppText variant="label">{format(parseISO(day), "EEEE d 'de' MMMM", { locale: es })}</AppText>
          <Card>
            {list.map((m) => (
              <ListRow
                key={m.id}
                title={medicationSummary(m)}
                subtitle={`${responseSummary(m)}${m.episodeId ? ' · vinculada a un episodio' : ''}`}
                value={format(parseISO(m.takenAt), 'HH:mm')}
                onPress={() => router.push({ pathname: '/registro/medicacion/[id]', params: { id: m.id } })}
              />
            ))}
          </Card>
        </View>
      ))}
      <Banner tone="info" message={MEDICATION_NOTICE} />
    </Screen>
  );
}
