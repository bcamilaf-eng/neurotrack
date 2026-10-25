/**
 * Moderación: lo reportado por la comunidad, para decidir si vuelve a verse o se elimina.
 * Primero lo que ya está oculto (llegó al umbral de reportes), luego lo más reportado.
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import {
  type ModerationAction,
  type ModerationItem,
  REPORT_HIDE_THRESHOLD,
  reportReasonLabel,
} from '../../domain/community';
import { getCommunity } from '../../state/services';
import { useSession } from '../../state/sessionStore';
import { AppText, Banner, Button, Card, EmptyState, Screen, useToast } from '../../ui/components';
import { CategoryTag, timeAgo } from '../../ui/features/community/PostCard';
import { spacing } from '../../ui/theme';
import { useAppTheme } from '../../ui/theme/ThemeContext';

const reportsLabel = (n: number) => (n === 1 ? '1 reporte' : `${n} reportes`);

function ModerationCard({
  item,
  busy,
  onAction,
}: {
  item: ModerationItem;
  busy: boolean;
  onAction: (action: ModerationAction) => void;
}) {
  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
        <CategoryTag label={item.kind === 'post' ? 'Tema' : 'Respuesta'} />
        <CategoryTag label={item.hidden ? `Oculto · ${reportsLabel(item.reports)}` : reportsLabel(item.reports)} />
      </View>
      {item.title ? <AppText variant="heading">{item.title}</AppText> : null}
      <AppText variant="caption" muted>
        {item.authorAlias} · {timeAgo(item.createdAt)}
      </AppText>
      <AppText numberOfLines={6}>{item.body}</AppText>
      <AppText variant="caption" muted>
        Motivos: {item.reasons.map(reportReasonLabel).join(' · ')}
      </AppText>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Button
            label="Restaurar"
            variant="secondary"
            disabled={busy}
            onPress={() => onAction('restore')}
            testID={`moderation-restore-${item.id}`}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Eliminar"
            variant="danger"
            disabled={busy}
            onPress={() => onAction('remove')}
            testID={`moderation-remove-${item.id}`}
          />
        </View>
      </View>
    </Card>
  );
}

export default function ModerationScreen() {
  const { colors } = useAppTheme();
  const toast = useToast();
  const user = useSession((s) => s.user);
  const [items, setItems] = useState<ModerationItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const community = await getCommunity();
      if (!(await community.isModerator(user.id))) {
        router.back();
        return;
      }
      setItems(await community.moderationQueue(user.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar lo reportado.');
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const run = async (item: ModerationItem, action: ModerationAction) => {
    if (!user) return;
    setBusy(item.id);
    setError(null);
    try {
      const community = await getCommunity();
      await community.moderate(user.id, { kind: item.kind, id: item.id }, action);
      setItems((current) => current?.filter((i) => i.id !== item.id) ?? null);
      toast.show(action === 'restore' ? 'Restaurado: vuelve a verse.' : 'Eliminado para todos.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo aplicar la decisión.');
    } finally {
      setBusy(null);
    }
  };

  const confirm = (item: ModerationItem, action: ModerationAction) => {
    const what = item.kind === 'post' ? 'el tema' : 'la respuesta';
    if (action === 'restore') {
      Alert.alert(`¿Restaurar ${what}?`, 'Volverá a verse para todos y se descartarán sus reportes.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Restaurar', onPress: () => run(item, action) },
      ]);
    } else {
      Alert.alert(
        `¿Eliminar ${what}?`,
        item.kind === 'post' ? 'Dejará de verse para todos, junto con sus respuestas.' : 'Dejará de verse para todos.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: () => run(item, action) },
        ],
      );
    }
  };

  return (
    <Screen edges={['left', 'right']}>
      <AppText muted>
        Con {REPORT_HIDE_THRESHOLD} reportes de personas distintas, algo se oculta solo. Aquí decides si vuelve a verse o se
        elimina.
      </AppText>
      {error ? <Banner tone="danger" message={error} /> : null}
      {items === null && !error ? <ActivityIndicator color={colors.primary} accessibilityLabel="Cargando lo reportado" /> : null}
      {items && items.length === 0 ? (
        <EmptyState icon="shield-checkmark-outline" title="Nada por revisar" message="No hay temas ni respuestas reportados." />
      ) : null}
      {items?.map((item) => (
        <ModerationCard key={item.id} item={item} busy={busy === item.id} onAction={(action) => confirm(item, action)} />
      ))}
    </Screen>
  );
}
