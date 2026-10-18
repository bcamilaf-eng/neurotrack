import { createRepositories } from '../../src/data/repositories';
import { COMMUNITY_RULES_VERSION } from '../../src/domain/community';
import { ValidationError } from '../../src/domain/errors';
import { createLocalCommunityService } from '../../src/services/community/localCommunity';
import { AliasTakenError, type CommunityService } from '../../src/services/community/types';
import { resetClock, setClock } from '../../src/utils/clock';
import { NOW, OTHER_USER_ID, USER_ID } from '../fixtures/factories';
import { createTestDatabase } from '../fixtures/testDatabase';

let db: Awaited<ReturnType<typeof createTestDatabase>>;
let community: CommunityService;

const post = { category: 'tips', title: 'Lo que me ayuda', body: 'Buscar un lugar oscuro y tranquilo.' } as const;

beforeEach(async () => {
  setClock(() => NOW);
  db = await createTestDatabase();
  community = createLocalCommunityService(db);
});

afterEach(async () => {
  resetClock();
  await db.close();
});

describe('unirse a la comunidad', () => {
  it('guarda el seudónimo con la versión de normas aceptada', async () => {
    expect(await community.getProfile(USER_ID)).toBeNull();
    await community.join(USER_ID, { alias: 'Luna', acceptedRules: true });
    expect(await community.getProfile(USER_ID)).toEqual({ userId: USER_ID, alias: 'Luna', rulesVersion: COMMUNITY_RULES_VERSION });
  });

  it('no repite seudónimos, sin distinguir mayúsculas', async () => {
    await community.join(USER_ID, { alias: 'Luna', acceptedRules: true });
    await expect(community.join(OTHER_USER_ID, { alias: 'luna', acceptedRules: true })).rejects.toBeInstanceOf(AliasTakenError);
  });

  it('no deja publicar sin unirse', async () => {
    await expect(community.createPost(USER_ID, post)).rejects.toThrow(/Únete/);
  });
});

describe('temas y respuestas', () => {
  beforeEach(async () => {
    await community.join(USER_ID, { alias: 'Luna', acceptedRules: true });
    await community.join(OTHER_USER_ID, { alias: 'Sol', acceptedRules: true });
  });

  it('muestra los temas de ejemplo y los nuevos primero, con su autor y respuestas', async () => {
    const examples = await community.listPosts(USER_ID);
    expect(examples.length).toBeGreaterThan(0);
    expect(examples.every((p) => p.authorAlias.endsWith('(ejemplo)'))).toBe(true);

    const created = await community.createPost(USER_ID, post);
    await community.createReply(OTHER_USER_ID, created.id, { body: 'A mí también me sirve.' });

    const [first] = await community.listPosts(USER_ID);
    expect(first).toMatchObject({ id: created.id, authorAlias: 'Luna', mine: true, replyCount: 1 });
    const thread = await community.getThread(OTHER_USER_ID, created.id);
    expect(thread.post.mine).toBe(false);
    expect(thread.replies).toEqual([expect.objectContaining({ authorAlias: 'Sol', mine: true })]);
  });

  it('filtra por categoría', async () => {
    await community.createPost(USER_ID, { ...post, category: 'support' });
    const support = await community.listPosts(USER_ID, { category: 'support' });
    expect(support.length).toBeGreaterThan(0);
    expect(support.every((p) => p.category === 'support')).toBe(true);
  });

  it('valida el texto, incluidos los datos de contacto', async () => {
    await expect(community.createPost(USER_ID, { ...post, body: 'Escríbeme al 612 345 678 si quieres' })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('solo borra lo propio', async () => {
    const created = await community.createPost(USER_ID, post);
    await expect(community.remove(OTHER_USER_ID, { kind: 'post', id: created.id })).rejects.toThrow();
    await community.remove(USER_ID, { kind: 'post', id: created.id });
    expect((await community.listPosts(OTHER_USER_ID)).map((p) => p.id)).not.toContain(created.id);
  });
});

describe('reportes', () => {
  const reporters = ['user-3', 'user-4', 'user-5'];

  beforeEach(async () => {
    await community.join(USER_ID, { alias: 'Luna', acceptedRules: true });
    for (const [i, id] of [OTHER_USER_ID, ...reporters].entries()) {
      await community.join(id, { alias: `Persona${i}`, acceptedRules: true });
    }
  });

  it('quien reporta deja de verlo; con tres reportes distintos se oculta para todos', async () => {
    const created = await community.createPost(USER_ID, post);
    const visibleTo = async (userId: string) => (await community.listPosts(userId)).some((p) => p.id === created.id);

    await community.report(reporters[0], { kind: 'post', id: created.id }, { reason: 'medical_advice' });
    await community.report(reporters[0], { kind: 'post', id: created.id }, { reason: 'spam' });
    expect(await visibleTo(reporters[0])).toBe(false);
    expect(await visibleTo(OTHER_USER_ID)).toBe(true);

    await community.report(reporters[1], { kind: 'post', id: created.id }, { reason: 'offensive' });
    expect(await visibleTo(OTHER_USER_ID)).toBe(true);
    await community.report(reporters[2], { kind: 'post', id: created.id }, { reason: 'offensive' });
    expect(await visibleTo(OTHER_USER_ID)).toBe(false);
    expect(await visibleTo(USER_ID)).toBe(false);
  });

  it('no se reporta lo propio', async () => {
    const created = await community.createPost(USER_ID, post);
    await expect(community.report(USER_ID, { kind: 'post', id: created.id }, { reason: 'spam' })).rejects.toThrow(/No puedes/);
  });

  it('las respuestas reportadas no cuentan para quien reportó', async () => {
    const created = await community.createPost(USER_ID, post);
    const reply = await community.createReply(OTHER_USER_ID, created.id, { body: 'Toma tal pastilla.' });
    await community.report(USER_ID, { kind: 'reply', id: reply.id }, { reason: 'medical_advice' });
    const thread = await community.getThread(USER_ID, created.id);
    expect(thread.replies).toHaveLength(0);
    expect(thread.post.replyCount).toBe(0);
  });
});

describe('eliminar la cuenta', () => {
  it('borra seudónimo, temas, respuestas y reportes de esa persona', async () => {
    const repos = createRepositories(db);
    await repos.account.ensureUser(USER_ID, 'ana@ejemplo.com');
    await community.join(USER_ID, { alias: 'Luna', acceptedRules: true });
    await community.join(OTHER_USER_ID, { alias: 'Sol', acceptedRules: true });
    const mine = await community.createPost(USER_ID, post);
    const theirs = await community.createPost(OTHER_USER_ID, post);
    await community.report(USER_ID, { kind: 'post', id: theirs.id }, { reason: 'spam' });

    await repos.account.deleteAllData(USER_ID, { keepAccount: false });

    expect(await community.getProfile(USER_ID)).toBeNull();
    const ids = (await community.listPosts(OTHER_USER_ID)).map((p) => p.id);
    expect(ids).toContain(theirs.id);
    expect(ids).not.toContain(mine.id);
    expect(await db.first('SELECT * FROM community_reports WHERE reporter_id = ?', [USER_ID])).toBeNull();
  });
});
