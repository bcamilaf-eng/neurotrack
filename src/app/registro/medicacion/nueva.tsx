/** Registro de una toma. `?episodio=<id>` la vincula a ese episodio. */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { emptyMedicationDraft } from '../../../domain/usecases/medicationDraft';
import { getRepositories } from '../../../state/services';
import { useSession } from '../../../state/sessionStore';
import { MedicationForm } from '../../../ui/features/medication/MedicationForm';
import { clock } from '../../../utils/clock';

export default function NewMedicationScreen() {
  const user = useSession((s) => s.user);
  const { episodio } = useLocalSearchParams<{ episodio?: string }>();
  const [initialDraft] = useState(() => emptyMedicationDraft(clock.now(), episodio || undefined));

  return (
    <MedicationForm
      initialDraft={initialDraft}
      submitLabel="Guardar medicación"
      onSave={async (input) => {
        const repos = await getRepositories();
        await repos.medications.create(user!.id, input);
      }}
      onSaved={() => router.back()}
    />
  );
}
