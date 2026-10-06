/** Edición de una toma guardada: completar la respuesta, corregir datos o eliminarla. */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { type MedicationDraft, medicationToDraft } from '../../../domain/usecases/medicationDraft';
import { getRepositories } from '../../../state/services';
import { useSession } from '../../../state/sessionStore';
import { AppText, Banner, Screen } from '../../../ui/components';
import { confirmDestructive } from '../../../ui/confirm';
import { MedicationForm } from '../../../ui/features/medication/MedicationForm';

export default function EditMedicationScreen() {
  const user = useSession((s) => s.user);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [draft, setDraft] = useState<MedicationDraft | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!user) return;
    getRepositories()
      .then((repos) => repos.medications.get(user.id, id))
      .then((record) => (record ? setDraft(medicationToDraft(record)) : setMissing(true)))
      .catch(() => setMissing(true));
  }, [user, id]);

  if (missing) {
    return (
      <Screen edges={['left', 'right']}>
        <Banner tone="danger" message="No se encontró esta toma. Puede que se haya eliminado." />
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
    const ok = await confirmDestructive({
      title: '¿Eliminar esta toma?',
      message: 'Se quitará de tus registros y del episodio al que esté vinculada.',
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;
    await (await getRepositories()).medications.remove(user!.id, id);
    router.back();
  };

  return (
    <MedicationForm
      initialDraft={draft}
      submitLabel="Guardar cambios"
      onSave={async (input) => {
        await (await getRepositories()).medications.update(user!.id, id, input);
      }}
      onSaved={() => router.back()}
      onDelete={remove}
    />
  );
}
