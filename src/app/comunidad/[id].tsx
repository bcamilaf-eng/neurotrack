/** Un tema con sus respuestas. Se puede responder, reportar lo de otros y borrar lo propio. */
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import {
  categoryLabel,
  COMMUNITY_NOTICE,
  type CommunityPost,
  type CommunityReply,
  type ReportTarget,
} from '../../domain/community';
import { ValidationError } from '../../domain/errors';
import { getCommunity } from '../../state/services';
import { useSession } from '../../state/sessionStore';
import { AppText, Banner, Button, Card, Screen, TextField } from '../../ui/components';
import { byline, CategoryTag } from '../../ui/features/community/PostCard';
import { ReportPanel } from '../../ui/features/community/ReportPanel';
import { spacing } from '../../ui/theme';
import { useAppTheme } from '../../ui/theme/ThemeContext';

export default function ThreadScreen() {
  const { colors } = useAppTheme();
  const user = useSession((s) => s.user);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [thread, setThread] = useState<{ post: CommunityPost; replies: CommunityReply[] } | null>(null);
  const [reply, setReply] = useState('');
  const [replyError, setReplyError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [reporting, setReporting] = useState<ReportTarget | null>(null);

  const load = useCallback(async () => {
    if (!user || !id) return;
    try {
      const community = await getCommunity();
      setThread(await community.getThread(user.id, id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir el tema.');
    }
  }, [user, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onReply = async () => {
    if (!user || !id) return;
    setSending(true);
    setReplyError(undefined);
    setError(null);
    try {
      const community = await getCommunity();
      await community.createReply(user.id, id, { body: reply });
      setReply('');
      await load();
    } catch (e) {
      if (e instanceof ValidationError) setReplyError(e.fields.body ?? e.message);
      else setError(e instanceof Error ? e.message : 'No se pudo enviar tu respuesta.');
    } finally {
      setSending(false);
    }
  };

  const confirmRemove = (target: ReportTarget) => {
    Alert.alert(
      target.kind === 'post' ? '¿Borrar tu tema?' : '¿Borrar tu respuesta?',
      target.kind === 'post' ? 'Dejará de verse junto con sus respuestas.' : 'Dejará de verse en este tema.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              const community = await getCommunity();
              await community.remove(user.id, target);
              if (target.kind === 'post') router.back();
              else await load();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'No se pudo borrar.');
            }
          },
        },
      ],
    );
  };

  if (!thread) {
    return (
      <Screen edges={['left', 'right']}>
        {error ? <Banner tone="danger" message={error} /> : <ActivityIndicator color={colors.primary} accessibilityLabel="Cargando el tema" />}
      </Screen>
    );
  }

  const { post, replies } = thread;

  return (
    <Screen
      edges={['left', 'right']}
      footer={
        <>
          <TextField
            label="Tu respuesta"
            value={reply}
            onChangeText={setReply}
            multiline
            maxLength={2000}
            error={replyError}
            testID="community-reply"
          />
          <Button label="Responder" onPress={onReply} loading={sending} disabled={reply.trim().length === 0} testID="community-send-reply" />
        </>
      }
    >
      {error ? <Banner tone="danger" message={error} /> : null}
      {notice ? <Banner tone="info" message={notice} /> : null}
      <Card>
        <CategoryTag label={categoryLabel(post.category)} />
        <AppText variant="title">{post.title}</AppText>
        <AppText variant="caption" muted>
          {byline(post.authorAlias, post.createdAt, post.mine)}
        </AppText>
        <AppText>{post.body}</AppText>
        {post.mine ? (
          <Button label="Borrar mi tema" variant="ghost" onPress={() => confirmRemove({ kind: 'post', id: post.id })} />
        ) : (
          <Button label="Reportar tema" variant="ghost" onPress={() => setReporting({ kind: 'post', id: post.id })} />
        )}
      </Card>

      {reporting ? (
        <ReportPanel
          what={reporting.kind === 'post' ? 'este tema' : 'esta respuesta'}
          onCancel={() => setReporting(null)}
          onSubmit={async (reason) => {
            if (!user) return;
            try {
              const community = await getCommunity();
              await community.report(user.id, reporting, { reason });
              setReporting(null);
              if (reporting.kind === 'post') {
                router.back();
              } else {
                setNotice('Gracias. Revisaremos la respuesta y ya no la verás.');
                await load();
              }
            } catch (e) {
              setError(e instanceof Error ? e.message : 'No se pudo enviar el reporte.');
            }
          }}
        />
      ) : null}

      <AppText variant="heading">
        {replies.length === 0 ? 'Aún no hay respuestas' : replies.length === 1 ? '1 respuesta' : `${replies.length} respuestas`}
      </AppText>
      {replies.map((r) => (
        <Card key={r.id}>
          <AppText variant="caption" muted>
            {byline(r.authorAlias, r.createdAt, r.mine)}
          </AppText>
          <AppText>{r.body}</AppText>
          <View style={{ alignItems: 'flex-start', marginTop: -spacing.sm }}>
            {r.mine ? (
              <Button label="Borrar" variant="ghost" onPress={() => confirmRemove({ kind: 'reply', id: r.id })} />
            ) : (
              <Button label="Reportar" variant="ghost" onPress={() => setReporting({ kind: 'reply', id: r.id })} />
            )}
          </View>
        </Card>
      ))}
      <AppText variant="caption" muted>
        {COMMUNITY_NOTICE}
      </AppText>
    </Screen>
  );
}
