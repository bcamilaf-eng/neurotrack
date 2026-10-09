/** Edición de un episodio guardado. */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { type EpisodeDraft, inputToDraft } from '../../../domain/usecases/episodeDraft';
import { getRepositories } from '../../../state/services';
import { useSession } from '../../../state/sessionStore';
import { AppText, Banner, Screen } from '../../../ui/components';
import { EpisodeForm } from '../../../ui/features/episode/EpisodeForm';

export default function EditEpisodeScreen() {
  const user = useSession((s) => s.user);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [draft, setDraft] = useState<EpisodeDraft | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!user) return;
    getRepositories()
      .then((repos) => repos.episodes.get(user.id, id).then((record) => (record ? repos.episodes.toInput(record) : null)))
      .then((input) => (input ? setDraft(inputToDraft(input)) : setMissing(true)))
      .catch(() => setMissing(true));
  }, [user, id]);

  if (missing) {
    return (
      <Screen edges={['left', 'right']}>
        <Banner tone="danger" message="No se encontró este episodio. Puede que se haya eliminado." />
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

  return (
    <EpisodeForm
      initialDraft={draft}
      submitLabel="Guardar cambios"
      onSave={async ({ input, allowOverlap }) => {
        const repos = await getRepositories();
        await repos.episodes.update(user!.id, id, input, { allowOverlap });
        return id;
      }}
      onSaved={() => router.back()}
      onOpenExisting={(other) => router.replace({ pathname: '/episodio/[id]', params: { id: other } })}
    />
  );
}
