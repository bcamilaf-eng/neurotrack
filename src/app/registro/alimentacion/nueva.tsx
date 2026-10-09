/** Nueva comida o ayuno. `?fecha=AAAA-MM-DD` elige el día. */
import { router } from 'expo-router';
import { useState } from 'react';
import { emptyMealDraft } from '../../../domain/usecases/habitDrafts';
import { getRepositories } from '../../../state/services';
import { useSession } from '../../../state/sessionStore';
import { MealForm } from '../../../ui/features/habits/MealForm';
import { useDayParam } from '../../../ui/hooks/useDayParam';
import { clock } from '../../../utils/clock';

export default function NewMealScreen() {
  const user = useSession((s) => s.user);
  const day = useDayParam();
  const [initialDraft] = useState(() => emptyMealDraft(day, clock.now()));
  return (
    <MealForm
      initialDraft={initialDraft}
      submitLabel="Guardar comida"
      onSave={async (input) => {
        await (await getRepositories()).meals.create(user!.id, input);
      }}
      onSaved={() => router.back()}
    />
  );
}
