/**
 * Comunidad en modo local de prueba.
 *
 * Los temas viven en la base cifrada de este teléfono, así que solo los ve quien lo usa.
 * Al abrirla por primera vez se cargan unos temas de ejemplo para ver cómo funciona.
 */
import type { SqlDatabase } from '../../data/db/types';
import { NotFoundError, parseOrThrow } from '../../domain/errors';
import {
  COMMUNITY_RULES_VERSION,
  type CommunityCategory,
  type CommunityPost,
  type CommunityProfile,
  type CommunityReply,
  joinCommunitySchema,
  postInputSchema,
  replyInputSchema,
  REPORT_HIDE_THRESHOLD,
  reportInputSchema,
  type ReportTarget,
} from '../../domain/community';
import { clock } from '../../utils/clock';
import { newId } from '../../utils/id';
import { EXAMPLE_AUTHOR_ID, EXAMPLE_THREADS } from './examples';
import { AliasTakenError, type CommunityService } from './types';

interface PostRow {
  id: string;
  author_id: string;
  author_alias: string;
  category: CommunityCategory;
  title: string;
  body: string;
  created_at: string;
  reply_count: number;
}

interface ReplyRow {
  id: string;
  post_id: string;
  author_id: string;
  author_alias: string;
  body: string;
  created_at: string;
}

const TABLE = { post: 'community_posts', reply: 'community_replies' } as const;

/** Visible para `?`: no borrado, no oculto y no reportado por esa persona. */
const visible = (alias: string, kind: 'post' | 'reply') => `
  ${alias}.deleted_at IS NULL AND ${alias}.hidden = 0
  AND NOT EXISTS (SELECT 1 FROM community_reports r
    WHERE r.reporter_id = ? AND r.target_kind = '${kind}' AND r.target_id = ${alias}.id)`;

export function createLocalCommunityService(db: SqlDatabase): CommunityService {
  let seeded = false;

  async function seedExamples() {
    if (seeded) return;
    seeded = true;
    const existing = await db.first<{ n: number }>(
      'SELECT COUNT(*) AS n FROM community_posts WHERE author_id = ?',
      [EXAMPLE_AUTHOR_ID],
    );
    if (existing && existing.n > 0) return;
    const now = clock.now().getTime();
    await db.transaction(async () => {
      for (const thread of EXAMPLE_THREADS) {
        const postId = newId();
        const postAt = new Date(now - thread.hoursAgo * 3_600_000).toISOString();
        await db.run(
          `INSERT INTO community_posts (id, author_id, author_alias, category, title, body, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [postId, EXAMPLE_AUTHOR_ID, thread.alias, thread.category, thread.title, thread.body, postAt, postAt],
        );
        for (const reply of thread.replies) {
          const replyAt = new Date(now - reply.hoursAgo * 3_600_000).toISOString();
          await db.run(
            `INSERT INTO community_replies (id, post_id, author_id, author_alias, body, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [newId(), postId, EXAMPLE_AUTHOR_ID, reply.alias, reply.body, replyAt, replyAt],
          );
        }
      }
    });
  }

  const toPost = (row: PostRow, userId: string): CommunityPost => ({
    id: row.id,
    category: row.category,
    title: row.title,
    body: row.body,
    authorAlias: row.author_alias,
    createdAt: row.created_at,
    replyCount: Number(row.reply_count),
    mine: row.author_id === userId,
  });

  const toReply = (row: ReplyRow, userId: string): CommunityReply => ({
    id: row.id,
    postId: row.post_id,
    body: row.body,
    authorAlias: row.author_alias,
    createdAt: row.created_at,
    mine: row.author_id === userId,
  });

  const postSelect = `
    SELECT p.id, p.author_id, p.author_alias, p.category, p.title, p.body, p.created_at,
      (SELECT COUNT(*) FROM community_replies c WHERE c.post_id = p.id AND ${visible('c', 'reply')}) AS reply_count
    FROM community_posts p`;

  async function requireProfile(userId: string): Promise<CommunityProfile> {
    const profile = await service.getProfile(userId);
    if (!profile) throw new Error('Únete a la comunidad para participar.');
    return profile;
  }

  async function findPost(userId: string, postId: string): Promise<CommunityPost> {
    const row = await db.first<PostRow>(`${postSelect} WHERE p.id = ? AND ${visible('p', 'post')}`, [
      userId,
      postId,
      userId,
    ]);
    if (!row) throw new NotFoundError('El tema');
    return toPost(row, userId);
  }

  const service: CommunityService = {
    mode: 'local',

    async getProfile(userId) {
      const row = await db.first<{ user_id: string; alias: string; rules_version: string }>(
        'SELECT user_id, alias, rules_version FROM community_profiles WHERE user_id = ?',
        [userId],
      );
      return row ? { userId: row.user_id, alias: row.alias, rulesVersion: row.rules_version } : null;
    },

    async join(userId, input) {
      const { alias } = parseOrThrow(joinCommunitySchema, input);
      const taken = await db.first<{ user_id: string }>(
        'SELECT user_id FROM community_profiles WHERE alias = ? AND user_id <> ?',
        [alias, userId],
      );
      if (taken || EXAMPLE_THREADS.some((t) => t.alias.toLowerCase() === alias.toLowerCase())) {
        throw new AliasTakenError();
      }
      const now = clock.now().toISOString();
      await db.run(
        `INSERT INTO community_profiles (user_id, alias, rules_version, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (user_id) DO UPDATE SET alias = excluded.alias, rules_version = excluded.rules_version,
           updated_at = excluded.updated_at`,
        [userId, alias, COMMUNITY_RULES_VERSION, now, now],
      );
      return { userId, alias, rulesVersion: COMMUNITY_RULES_VERSION };
    },

    async listPosts(userId, options = {}) {
      await seedExamples();
      const params: (string | null)[] = [userId, userId];
      let where = visible('p', 'post');
      if (options.category) {
        where += ' AND p.category = ?';
        params.push(options.category);
      }
      const rows = await db.all<PostRow>(`${postSelect} WHERE ${where} ORDER BY p.created_at DESC LIMIT 100`, params);
      return rows.map((row) => toPost(row, userId));
    },

    async getThread(userId, postId) {
      const post = await findPost(userId, postId);
      const rows = await db.all<ReplyRow>(
        `SELECT c.id, c.post_id, c.author_id, c.author_alias, c.body, c.created_at
         FROM community_replies c WHERE c.post_id = ? AND ${visible('c', 'reply')} ORDER BY c.created_at`,
        [postId, userId],
      );
      return { post, replies: rows.map((row) => toReply(row, userId)) };
    },

    async createPost(userId, input) {
      const profile = await requireProfile(userId);
      const data = parseOrThrow(postInputSchema, input);
      const id = newId();
      const now = clock.now().toISOString();
      await db.run(
        `INSERT INTO community_posts (id, author_id, author_alias, category, title, body, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, userId, profile.alias, data.category, data.title, data.body, now, now],
      );
      return findPost(userId, id);
    },

    async createReply(userId, postId, input) {
      const profile = await requireProfile(userId);
      const data = parseOrThrow(replyInputSchema, input);
      await findPost(userId, postId);
      const id = newId();
      const now = clock.now().toISOString();
      await db.run(
        `INSERT INTO community_replies (id, post_id, author_id, author_alias, body, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, postId, userId, profile.alias, data.body, now, now],
      );
      return { id, postId, body: data.body, authorAlias: profile.alias, createdAt: now, mine: true };
    },

    async report(userId, target, input) {
      await requireProfile(userId);
      const { reason } = parseOrThrow(reportInputSchema, input);
      const table = TABLE[target.kind];
      const row = await db.first<{ author_id: string }>(`SELECT author_id FROM ${table} WHERE id = ?`, [target.id]);
      if (!row) throw new NotFoundError();
      if (row.author_id === userId) throw new Error('No puedes reportar lo que escribiste. Puedes borrarlo.');
      await db.transaction(async () => {
        await db.run(
          `INSERT INTO community_reports (id, reporter_id, target_kind, target_id, reason, created_at)
           VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
          [newId(), userId, target.kind, target.id, reason, clock.now().toISOString()],
        );
        await hideIfReported(target);
      });
    },

    async remove(userId, target) {
      const now = clock.now().toISOString();
      const result = await db.run(
        `UPDATE ${TABLE[target.kind]} SET deleted_at = ?, updated_at = ? WHERE id = ? AND author_id = ? AND deleted_at IS NULL`,
        [now, now, target.id, userId],
      );
      if (result.changes === 0) throw new NotFoundError();
    },
  };

  async function hideIfReported(target: ReportTarget) {
    const count = await db.first<{ n: number }>(
      'SELECT COUNT(DISTINCT reporter_id) AS n FROM community_reports WHERE target_kind = ? AND target_id = ?',
      [target.kind, target.id],
    );
    if ((count?.n ?? 0) >= REPORT_HIDE_THRESHOLD) {
      await db.run(`UPDATE ${TABLE[target.kind]} SET hidden = 1 WHERE id = ?`, [target.id]);
    }
  }

  return service;
}

