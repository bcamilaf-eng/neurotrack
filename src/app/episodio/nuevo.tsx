/** Registro de un episodio nuevo. `?paso=2` abre directamente en síntomas. */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { emptyDraft } from '../../domain/usecases/episodeDraft';
import { getRepositories } from '../../state/services';
import { useSession } from '../../state/sessionStore';
import { EpisodeForm, STEPS } from '../../ui/features/episode/EpisodeForm';
import { clock } from '../../utils/clock';

export default function NewEpisodeScreen() {
  const user = useSession((s) => s.user);
  const { paso } = useLocalSearchParams<{ paso?: string }>();
  const [initialDraft] = useState(() => emptyDraft(clock.now()));
  const step = Math.min(Math.max(Number(paso) || 0, 0), STEPS.length - 1);

  return (
    <EpisodeForm
      initialDraft={initialDraft}
      initialStep={step}
      submitLabel="Guardar episodio"
      onSave={async ({ input, allowOverlap }) => {
        const repos = await getRepositories();
        const record = await repos.episodes.create(user!.id, input, { allowOverlap });
        return record.id;
      }}
      onSaved={(id) => router.replace({ pathname: '/episodio/[id]', params: { id } })}
      onOpenExisting={(id) => router.replace({ pathname: '/episodio/[id]', params: { id } })}
    />
  );
}
