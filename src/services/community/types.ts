/**
 * Contrato de la Comunidad.
 *
 * Hay dos implementaciones, igual que en la autenticación:
 * - `cloud`: Supabase; los foros son compartidos entre todas las personas.
 * - `local`: modo de prueba sin servidor; los temas viven en este teléfono, con algunos de ejemplo.
 *
 * Todas las operaciones actúan en nombre de `userId`; quien no se unió (sin seudónimo) solo puede unirse.
 */
import type {
  CommunityCategory,
  CommunityPost,
  CommunityProfile,
  CommunityReply,
  JoinCommunityInput,
  PostInput,
  ReplyInput,
  ReportInput,
  ReportTarget,
} from '../../domain/community';

export interface CommunityService {
  readonly mode: 'cloud' | 'local';
  /** Seudónimo y versión de normas aceptada; `null` si aún no se unió. */
  getProfile(userId: string): Promise<CommunityProfile | null>;
  join(userId: string, input: JoinCommunityInput): Promise<CommunityProfile>;
  /** Temas visibles, del más reciente al más antiguo. */
  listPosts(userId: string, options?: { category?: CommunityCategory }): Promise<CommunityPost[]>;
  getThread(userId: string, postId: string): Promise<{ post: CommunityPost; replies: CommunityReply[] }>;
  createPost(userId: string, input: PostInput): Promise<CommunityPost>;
  createReply(userId: string, postId: string, input: ReplyInput): Promise<CommunityReply>;
  /** Tras reportar, quien reporta deja de ver ese contenido aunque aún no se haya ocultado para todos. */
  report(userId: string, target: ReportTarget, input: ReportInput): Promise<void>;
  /** Solo borra contenido propio. */
  remove(userId: string, target: ReportTarget): Promise<void>;
}

export class AliasTakenError extends Error {
  constructor() {
    super('Ese seudónimo ya está en uso. Elige otro.');
    this.name = 'AliasTakenError';
  }
}
