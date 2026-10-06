/**
 * Detalle de un episodio: resumen de lo registrado y línea temporal con su evolución.
 * Mientras el episodio sigue en curso se puede anotar cómo cambia el dolor y cerrarlo.
 */
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AURA_TYPES,
  EPISODE_TYPES,
  labelOf,
  PAIN_LOCATIONS,
  PAIN_QUALITIES,
  painBand,
  SYMPTOMS,
  TRIGGERS,
} from '../../../domain/catalogs';
import { ValidationError } from '../../../domain/errors';
import type { EpisodeEventRecord, EpisodeRecord } from '../../../data/repositories/episodeRepository';
import { getRepositories } from '../../../state/services';
import { useSession } from '../../../state/sessionStore';
import { AppText, Banner, Button, Card, Disclaimer, Screen, TextField } from '../../../ui/components';
import { confirmDestructive } from '../../../ui/confirm';
import { PainScale, painColor } from '../../../ui/features/episode/PainScale';
import { spacing } from '../../../ui/theme';
import { useAppTheme } from '../../../ui/theme/ThemeContext';
import { clock } from '../../../utils/clock';
import { formatDuration, minutesBetween } from '../../../utils/time';

const when = (iso: string) => format(parseISO(iso), "EEEE d 'de' MMMM, HH:mm", { locale: es });
const hour = (iso: string) => format(parseISO(iso), 'HH:mm');

interface TimelineItem {
  key: string;
  at: string;
  title: string;
  detail?: string;
  intensity?: number;
  eventId?: string;
}

function buildTimeline(episode: EpisodeRecord, events: EpisodeEventRecord[]): TimelineItem[] {
  const items: TimelineItem[] = [
    { key: 'start', at: episode.startedAt, title: 'Inicio', intensity: episode.intensity },
    ...events.map((e) => ({
      key: e.id,
      eventId: e.id,
      at: e.at,
      title: e.kind === 'pain' ? 'Cambio de intensidad' : e.kind === 'medication' ? 'Medicación' : 'Nota',
      intensity: e.intensity,
      detail: e.note,
    })),
  ];
  if (episode.endedAt) items.push({ key: 'end', at: episode.endedAt, title: 'Fin' });
  return items.sort((a, b) => a.at.localeCompare(b.at));
}

function Section({ title, values }: { title: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <View style={styles.section}>
      <AppText variant="label">{title}</AppText>
      <AppText>{values.join(', ')}</AppText>
    </View>
  );
}

export default function EpisodeDetailScreen() {
  const user = useSession((s) => s.user);
  const { colors, dark } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [episode, setEpisode] = useState<EpisodeRecord | null | undefined>(undefined);
  const [events, setEvents] = useState<EpisodeEventRecord[]>([]);
  const [update, setUpdate] = useState<number | undefined>();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const repos = await getRepositories();
    const record = await repos.episodes.get(user.id, id);
    setEpisode(record);
    setEvents(record ? await repos.episodes.listEvents(user.id, id) : []);
  }, [user, id]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => setEpisode(null));
    }, [load]),
  );

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    setBusy(true);
    try {
      await action();
      await load();
      return true;
    } catch (e) {
      setError(e instanceof ValidationError ? Object.values(e.fields)[0] : e instanceof Error ? e.message : 'No se pudo guardar.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (episode === undefined) {
    return (
      <Screen edges={['left', 'right']}>
        <AppText muted>Cargando…</AppText>
      </Screen>
    );
  }
  if (episode === null) {
    return (
      <Screen edges={['left', 'right']}>
        <Banner tone="danger" message="No se encontró este episodio. Puede que se haya eliminado." />
      </Screen>
    );
  }

  const repos = () => getRepositories();
  const now = () => clock.now().toISOString();
  const elapsed = episode.ongoing ? minutesBetween(episode.startedAt, now()) : episode.durationMin;

  const addPain = () =>
    run(async () => {
      if (update === undefined) throw new ValidationError({ intensity: 'Elige la intensidad actual.' });
      await (await repos()).episodes.addEvent(user!.id, id, { at: now(), kind: 'pain', intensity: update });
    }).then((ok) => ok && setUpdate(undefined));

  const addNote = () =>
    run(async () => {
      await (await repos()).episodes.addEvent(user!.id, id, { at: now(), kind: 'note', note });
    }).then((ok) => ok && setNote(''));

  const closeNow = () => run(async () => (await repos()).episodes.close(user!.id, id, now()));

  const removeEvent = async (eventId: string) => {
    const ok = await confirmDestructive({
      title: '¿Eliminar esta anotación?',
      message: 'Se quitará de la línea temporal del episodio.',
      confirmLabel: 'Eliminar',
    });
    if (ok) await run(async () => (await repos()).episodes.removeEvent(user!.id, id, eventId));
  };

  const removeEpisode = async () => {
    const ok = await confirmDestructive({
      title: '¿Eliminar este episodio?',
      message: 'Se borrará el episodio con sus síntomas, desencadenantes y anotaciones. No se puede deshacer.',
      confirmLabel: 'Eliminar episodio',
    });
    if (!ok) return;
    if (await run(async () => (await repos()).episodes.remove(user!.id, id))) router.back();
  };

  const typeLabel =
    episode.type === 'other' && episode.typeOther ? episode.typeOther : labelOf(EPISODE_TYPES, episode.type);
  const labels = <K extends string>(catalog: readonly { code: K; label: string }[], codes: K[], other?: string) =>
    codes.map((code) => (code === 'other' && other ? other : labelOf(catalog, code)));

  return (
    <Screen edges={['left', 'right']}>
      <View>
        <AppText variant="caption" muted>
          {when(episode.startedAt)}
        </AppText>
        <AppText variant="title">Episodio registrado como {typeLabel.toLowerCase()}</AppText>
      </View>
      {episode.ongoing ? <Banner tone="info" title="En curso" message="Puedes anotar cómo evoluciona y cerrarlo cuando termine." /> : null}
      {error ? <Banner tone="danger" message={error} /> : null}

      <Card>
        <View style={styles.stats}>
          <View style={styles.stat} accessible accessibilityLabel={`Intensidad máxima ${episode.maxIntensity} de 10, ${painBand(episode.maxIntensity)}`}>
            <View style={[styles.dot, { backgroundColor: painColor(episode.maxIntensity, dark) }]} />
            <AppText variant="title">{episode.maxIntensity}/10</AppText>
            <AppText variant="caption" muted>
              Intensidad máxima · {painBand(episode.maxIntensity)}
            </AppText>
          </View>
          <View style={styles.stat} accessible>
            <AppText variant="title">{elapsed === null ? '—' : formatDuration(elapsed)}</AppText>
            <AppText variant="caption" muted>
              {episode.ongoing ? 'Desde el inicio' : 'Duración'}
            </AppText>
          </View>
        </View>
      </Card>

      <Card>
        <Section title="Localización" values={labels(PAIN_LOCATIONS, episode.locations, episode.locationOther)} />
        <Section title="Características" values={labels(PAIN_QUALITIES, episode.qualities, episode.qualityOther)} />
        <Section title="Síntomas" values={episode.symptoms.map((s) => labelOf(SYMPTOMS, s.type))} />
        {episode.aura ? (
          <Section
            title="Aura"
            values={[
              ...episode.aura.types.map((c) => labelOf(AURA_TYPES, c)),
              ...(episode.aura.durationMin ? [`${episode.aura.durationMin} min`] : []),
            ]}
          />
        ) : null}
        <Section
          title="Posibles desencadenantes que anotaste"
          values={episode.triggers.map((t) => (t.detail ? `${labelOf(TRIGGERS, t.type)} (${t.detail})` : labelOf(TRIGGERS, t.type)))}
        />
        {episode.notes ? <Section title="Notas" values={[episode.notes]} /> : null}
        <Button label="Editar episodio" variant="secondary" onPress={() => router.push({ pathname: '/episodio/[id]/editar', params: { id } })} />
      </Card>

      <View style={styles.section}>
        <AppText variant="heading">Línea temporal</AppText>
        {buildTimeline(episode, events).map((item) => (
          <View key={item.key} style={styles.timelineRow}>
            <AppText variant="label" style={styles.time}>
              {hour(item.at)}
            </AppText>
            <View style={[styles.rail, { backgroundColor: colors.border }]}>
              <View style={[styles.node, { backgroundColor: item.intensity !== undefined ? painColor(item.intensity, dark) : colors.primary }]} />
            </View>
            <View style={styles.timelineText}>
              <AppText variant="label">
                {item.title}
                {item.intensity !== undefined ? ` · ${item.intensity}/10` : ''}
              </AppText>
              {item.detail ? <AppText muted>{item.detail}</AppText> : null}
              {item.eventId ? (
                <Button label="Eliminar anotación" variant="ghost" onPress={() => removeEvent(item.eventId!)} />
              ) : null}
            </View>
          </View>
        ))}
      </View>

      {episode.ongoing ? (
        <Card>
          <PainScale label="¿Cuánto duele ahora?" value={update} onChange={setUpdate} />
          <Button label="Anotar intensidad actual" onPress={addPain} disabled={update === undefined || busy} testID="add-pain" />
          <TextField label="Nota" value={note} onChangeText={setNote} placeholder="Ej.: me acosté a oscuras" />
          <Button label="Añadir nota" variant="secondary" onPress={addNote} disabled={!note.trim() || busy} />
          <Button label="El episodio terminó ahora" variant="secondary" onPress={closeNow} disabled={busy} testID="close-episode" />
        </Card>
      ) : null}

      <Button label="Eliminar episodio" variant="danger" onPress={removeEpisode} disabled={busy} />
      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: spacing.lg },
  stat: { flex: 1, gap: spacing.xs },
  dot: { width: 12, height: 12, borderRadius: 6 },
  section: { gap: spacing.xs },
  timelineRow: { flexDirection: 'row', gap: spacing.md, minHeight: 48 },
  time: { width: 48 },
  rail: { width: 2, alignItems: 'center' },
  node: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  timelineText: { flex: 1, paddingBottom: spacing.md },
});
