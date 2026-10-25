/** Comunidad: foros por categoría donde personas con migraña comparten consejos y experiencias. */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_NOTICE,
  COMMUNITY_RULES_VERSION,
  type CommunityCategory,
  type CommunityPost,
  type CommunityProfile,
} from '../../domain/community';
import { getCommunity } from '../../state/services';
import { useSession } from '../../state/sessionStore';
import { AppText, Banner, Button, EmptyState, OptionGroup, Screen } from '../../ui/components';
import { JoinCommunity } from '../../ui/features/community/JoinCommunity';
import { PostCard } from '../../ui/features/community/PostCard';
import { useAppTheme } from '../../ui/theme/ThemeContext';

type Filter = CommunityCategory | 'all';
const FILTERS: readonly { code: Filter; label: string }[] = [{ code: 'all', label: 'Todas' }, ...COMMUNITY_CATEGORIES];

const LOCAL_COMMUNITY_NOTICE =
  'Modo local de prueba: los temas solo existen en este teléfono. Los marcados «(ejemplo)» sirven para ver cómo funciona.';

export default function CommunityScreen() {
  const { colors } = useAppTheme();
  const user = useSession((s) => s.user);
  const [profile, setProfile] = useState<CommunityProfile | null | undefined>(undefined);
  const [posts, setPosts] = useState<CommunityPost[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [mode, setMode] = useState<'cloud' | 'local' | null>(null);
  const [moderator, setModerator] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (category: Filter) => {
      if (!user) return;
      setError(null);
      try {
        const community = await getCommunity();
        setMode(community.mode);
        const current = await community.getProfile(user.id);
        // Si cambiaron las normas, se vuelven a pedir.
        const joined = current && current.rulesVersion === COMMUNITY_RULES_VERSION ? current : null;
        setProfile(joined);
        if (joined) {
          const [list, canModerate] = await Promise.all([
            community.listPosts(user.id, { category: category === 'all' ? undefined : category }),
            community.isModerator(user.id).catch(() => false),
          ]);
          setPosts(list);
          setModerator(canModerate);
        }
      } catch (e) {
        setProfile((p) => p ?? null);
        setError(e instanceof Error ? e.message : 'No se pudo cargar la comunidad.');
      }
    },
    [user],
  );

  useFocusEffect(
    useCallback(() => {
      load(filter);
    }, [load, filter]),
  );

  if (profile === undefined) {
    return (
      <Screen>
        <AppText variant="title">Comunidad</AppText>
        <ActivityIndicator color={colors.primary} accessibilityLabel="Cargando la comunidad" />
      </Screen>
    );
  }

  if (profile === null) {
    return (
      <Screen>
        {error ? <Banner tone="danger" message={error} /> : null}
        <JoinCommunity
          onJoined={(joined) => {
            setProfile(joined);
            load(filter);
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="title">Comunidad</AppText>
      <AppText muted>Participas como {profile.alias}.</AppText>
      {mode === 'local' ? <Banner tone="info" message={LOCAL_COMMUNITY_NOTICE} /> : null}
      <Button label="+ Nuevo tema" onPress={() => router.push('/comunidad/nuevo')} testID="community-new" />
      {moderator ? (
        <Button
          label="Revisar lo reportado"
          variant="secondary"
          icon="shield-checkmark-outline"
          onPress={() => router.push('/comunidad/moderacion')}
          testID="community-moderation"
        />
      ) : null}
      <OptionGroup
        label="Categoría"
        options={FILTERS}
        value={filter}
        onChange={(value) => {
          const next = value ?? 'all';
          setFilter(next);
          setPosts(null);
        }}
      />
      {error ? <Banner tone="danger" message={error} /> : null}
      {posts === null && !error ? <ActivityIndicator color={colors.primary} accessibilityLabel="Cargando temas" /> : null}
      {posts && posts.length === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          title="Aún no hay temas aquí"
          message="Abre el primero y cuenta tu experiencia."
          actionLabel="Nuevo tema"
          onAction={() => router.push('/comunidad/nuevo')}
        />
      ) : null}
      {posts?.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onPress={() => router.push({ pathname: '/comunidad/[id]', params: { id: post.id } })}
        />
      ))}
      <AppText variant="caption" muted>
        {COMMUNITY_NOTICE}
      </AppText>
    </Screen>
  );
}
