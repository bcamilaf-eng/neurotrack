/**
 * Comunidad en la nube (Supabase): los foros son compartidos entre todas las personas con cuenta.
 *
 * La seguridad la impone el servidor (supabase/migrations/20261018000000_comunidad.sql):
 * cada persona solo escribe y borra lo suyo, el autor sale de la sesión y ocultar por reportes
 * lo hace un disparador. Aquí solo se valida para dar mensajes claros antes de enviar.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  COMMUNITY_RULES_VERSION,
  type CommunityCategory,
  type CommunityPost,
  type CommunityReply,
  joinCommunitySchema,
  type ModerationItem,
  postInputSchema,
  replyInputSchema,
  reportInputSchema,
  type ReportTarget,
} from '../../domain/community';
import { NotFoundError, parseOrThrow } from '../../domain/errors';
import { clock } from '../../utils/clock';
import { AliasTakenError, type CommunityService } from './types';

const POST_COLUMNS = 'id, author_id, category, title, body, reply_count, created_at, author:community_profiles(alias)';
const REPLY_COLUMNS = 'id, post_id, author_id, body, created_at, author:community_profiles(alias)';

type Author = { alias: string } | { alias: string }[] | null;

interface PostRow {
  id: string;
  author_id: string;
  category: CommunityCategory;
  title: string;
  body: string;
  reply_count: number;
  created_at: string;
  author: Author;
}

interface ReplyRow {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: Author;
}

interface ModerationRow {
  kind: ReportTarget['kind'];
  id: string;
  post_id: string;
  title: string | null;
  body: string;
  author_alias: string;
  created_at: string;
  hidden: boolean;
  reports: number | string;
  reasons: ModerationItem['reasons'];
}

const aliasOf =(author: Author) => (Array.isArray(author) ? author[0]?.alias : author?.alias) ?? 'Anónimo';

class CommunityNetworkError extends Error {
  constructor() {
    super('No se pudo conectar con la comunidad. Comprueba tu conexión e inténtalo de nuevo.');
    this.name = 'CommunityNetworkError';
  }
}

function check<T>(result: { data: T; error: { code?: string; message: string } | null }): T {
  if (result.error) {
    if (result.error.code === '23505') throw new AliasTakenError();
    throw new CommunityNetworkError();
  }
  return result.data;
}

export function createSupabaseCommunityService(client: SupabaseClient): CommunityService {
  /** Contenido que esta persona reportó: deja de verlo aunque aún no esté oculto para todos. */
  async function myReports(kind: ReportTarget['kind']): Promise<Set<string>> {
    const rows = check(
      await client.from('community_reports').select('target_id').eq('target_kind', kind),
    ) as { target_id: string }[];
    return new Set(rows.map((r) => r.target_id));
  }

  const toPost = (row: PostRow, userId: string): CommunityPost => ({
    id: row.id,
    category: row.category,
    title: row.title,
    body: row.body,
    authorAlias: aliasOf(row.author),
    createdAt: row.created_at,
    replyCount: row.reply_count,
    mine: row.author_id === userId,
  });

  const toReply = (row: ReplyRow, userId: string): CommunityReply => ({
    id: row.id,
    postId: row.post_id,
    body: row.body,
    authorAlias: aliasOf(row.author),
    createdAt: row.created_at,
    mine: row.author_id === userId,
  });

  return {
    mode: 'cloud',

    async getProfile(userId) {
      const row = check(
        await client
          .from('community_profiles')
          .select('user_id, alias, rules_version')
          .eq('user_id', userId)
          .maybeSingle(),
      ) as { user_id: string; alias: string; rules_version: string } | null;
      return row ? { userId: row.user_id, alias: row.alias, rulesVersion: row.rules_version } : null;
    },

    async join(userId, input) {
      const { alias } = parseOrThrow(joinCommunitySchema, input);
      check(
        await client.from('community_profiles').upsert({
          user_id: userId,
          alias,
          rules_version: COMMUNITY_RULES_VERSION,
          updated_at: clock.now().toISOString(),
        }),
      );
      return { userId, alias, rulesVersion: COMMUNITY_RULES_VERSION };
    },

    async listPosts(userId, options = {}) {
      let query = client.from('community_posts').select(POST_COLUMNS).order('created_at', { ascending: false }).limit(100);
      if (options.category) query = query.eq('category', options.category);
      const [rows, reported] = await Promise.all([query.then(check), myReports('post')]);
      return (rows as unknown as PostRow[]).filter((r) => !reported.has(r.id)).map((r) => toPost(r, userId));
    },

    async getThread(userId, postId) {
      const [postRow, replyRows, reportedPosts, reportedReplies] = await Promise.all([
        client.from('community_posts').select(POST_COLUMNS).eq('id', postId).maybeSingle().then(check),
        client.from('community_replies').select(REPLY_COLUMNS).eq('post_id', postId).order('created_at').then(check),
        myReports('post'),
        myReports('reply'),
      ]);
      if (!postRow || reportedPosts.has(postId)) throw new NotFoundError('El tema');
      return {
        post: toPost(postRow as unknown as PostRow, userId),
        replies: (replyRows as unknown as ReplyRow[]).filter((r) => !reportedReplies.has(r.id)).map((r) => toReply(r, userId)),
      };
    },

    async createPost(userId, input) {
      const data = parseOrThrow(postInputSchema, input);
      const row = check(await client.from('community_posts').insert(data).select(POST_COLUMNS).single());
      return toPost(row as unknown as PostRow, userId);
    },

    async createReply(userId, postId, input) {
      const data = parseOrThrow(replyInputSchema, input);
      const row = check(
        await client.from('community_replies').insert({ post_id: postId, body: data.body }).select(REPLY_COLUMNS).single(),
      );
      return toReply(row as unknown as ReplyRow, userId);
    },

    async report(_userId, target, input) {
      const { reason } = parseOrThrow(reportInputSchema, input);
      const { error } = await client
        .from('community_reports')
        .insert({ target_kind: target.kind, target_id: target.id, reason });
      // Reportar dos veces lo mismo no es un error para quien reporta.
      if (error && error.code !== '23505') throw new CommunityNetworkError();
    },

    async remove(userId, target) {
      const table = target.kind === 'post' ? 'community_posts' : 'community_replies';
      const now = clock.now().toISOString();
      const { error, count } = await client
        .from(table)
        .update({ deleted_at: now, updated_at: now }, { count: 'exact' })
        .eq('id', target.id)
        .eq('author_id', userId);
      if (error) throw new CommunityNetworkError();
      if (count === 0) throw new NotFoundError();
    },

    // Las funciones del servidor comprueban por su cuenta que quien llama sea moderador
    // (supabase/migrations/20261025000000_moderacion.sql).
    async isModerator() {
      return check(await client.rpc('community_is_moderator')) === true;
    },

    async moderationQueue() {
      const rows = check(await client.rpc('community_moderation_queue')) as ModerationRow[];
      return rows.map(
        (row): ModerationItem => ({
          kind: row.kind,
          id: row.id,
          postId: row.post_id,
          title: row.title,
          body: row.body,
          authorAlias: row.author_alias,
          createdAt: row.created_at,
          hidden: row.hidden,
          reports: Number(row.reports),
          reasons: row.reasons,
        }),
      );
    },

    async moderate(_userId, target, action) {
      check(await client.rpc('community_moderate', { target_kind: target.kind, target_id: target.id, action }));
    },
  };
}
