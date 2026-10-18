/** Tarjeta de un tema en la lista de la comunidad. */
import { formatDistanceStrict, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Pressable, StyleSheet, View } from 'react-native';
import { categoryLabel, type CommunityPost } from '../../../domain/community';
import { clock } from '../../../utils/clock';
import { AppText } from '../../components';
import { radius, spacing } from '../../theme';
import { useAppTheme } from '../../theme/ThemeContext';

/** «hace 5 horas», relativo al reloj de la app. */
export function timeAgo(iso: string): string {
  return formatDistanceStrict(parseISO(iso), clock.now(), { locale: es, addSuffix: true });
}

export function byline(alias: string, iso: string, mine: boolean): string {
  return `${mine ? `${alias} (tú)` : alias} · ${timeAgo(iso)}`;
}

export function CategoryTag({ label }: { label: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.tag, { backgroundColor: colors.primarySoft }]}>
      <AppText variant="caption" color={colors.primary}>
        {label}
      </AppText>
    </View>
  );
}

export function PostCard({ post, onPress }: { post: CommunityPost; onPress: () => void }) {
  const { colors } = useAppTheme();
  const replies = post.replyCount === 1 ? '1 respuesta' : `${post.replyCount} respuestas`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${post.title}. ${categoryLabel(post.category)}. De ${post.authorAlias}, ${timeAgo(post.createdAt)}. ${replies}.`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <CategoryTag label={categoryLabel(post.category)} />
      <AppText variant="heading">{post.title}</AppText>
      <AppText numberOfLines={2} muted>
        {post.body}
      </AppText>
      <AppText variant="caption" muted>
        {byline(post.authorAlias, post.createdAt, post.mine)} · {replies}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg, gap: spacing.sm },
  tag: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 2 },
});
