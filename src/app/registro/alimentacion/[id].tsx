/** Edición o borrado de una comida guardada. */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { type MealDraft, mealToDraft } from '../../../domain/usecases/habitDrafts';
import { getRepositories } from '../../../state/services';
import { useSession } from '../../../state/sessionStore';
import { AppText, Banner, Screen } from '../../../ui/components';
import { confirmDestructive } from '../../../ui/confirm';
import { MealForm } from '../../../ui/features/habits/MealForm';

export default function EditMealScreen() {
  const user = useSession((s) => s.user);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [draft, setDraft] = useState<MealDraft | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!user) return;
    getRepositories()
      .then((repos) => repos.meals.get(user.id, id))
      .then((record) => (record ? setDraft(mealToDraft(record)) : setMissing(true)))
      .catch(() => setMissing(true));
  }, [user, id]);

  if (missing) {
    return (
      <Screen edges={['left', 'right']}>
        <Banner tone="danger" message="No se encontró esta comida. Puede que se haya eliminado." />
      </Screen>
    );
  }
  if (!draft) {
    return (
      <Screen edges={['left', 'right']}>
        <AppText muted>Cargando…</AppText>
      </Screen>
    );
  }

  const remove = async () => {
    const ok = await confirmDestructive({ title: '¿Eliminar esta comida?', message: 'Se quitará de tus registros.', confirmLabel: 'Eliminar' });
    if (!ok) return;
    await (await getRepositories()).meals.remove(user!.id, id);
    router.back();
  };

  return (
    <MealForm
      initialDraft={draft}
      submitLabel="Guardar cambios"
      onSave={async (input) => {
        await (await getRepositories()).meals.update(user!.id, id, input);
      }}
      onSaved={() => router.back()}
      onDelete={remove}
    />
  );
}
