/**
 * Señales de alarma detectadas en los episodios (tabla `alarm_flags`).
 *
 * Se evalúan cada vez que un episodio se crea o cambia. Una señal que deja de cumplirse
 * (porque se corrigió el registro) se borra; una que sigue presente conserva cuándo se
 * mostró y cuándo la reconoció el usuario.
 */
import { addDays, format, parseISO } from 'date-fns';
import {
  ALARM_RULES_VERSION,
  type AlarmEpisode,
  type AlarmSignal,
  evaluateAlarmSignals,
} from '../../domain/alerts/rules';
import type { SymptomType } from '../../domain/catalogs';
import { clock } from '../../utils/clock';
import { newId } from '../../utils/id';
import type { SqlDatabase } from '../db/types';
import type { AccountRepository } from './accountRepository';
import type { EpisodeRepository } from './episodeRepository';

export interface AlarmFlag {
  id: string;
  episodeId: string;
  signal: AlarmSignal;
  rulesVersion: string;
  detectedAt: string;
  shownAt?: string;
  acknowledgedAt?: string;
}

function toFlag(row: Record<string, unknown>): AlarmFlag {
  return {
    id: String(row.id),
    episodeId: String(row.episode_id),
    signal: row.signal as AlarmSignal,
    rulesVersion: String(row.rules_version),
    detectedAt: String(row.detected_at),
    shownAt: row.shown_at ? String(row.shown_at) : undefined,
    acknowledgedAt: row.acknowledged_at ? String(row.acknowledged_at) : undefined,
  };
}

export class AlarmRepository {
  constructor(
    private readonly db: SqlDatabase,
    private readonly episodes: EpisodeRepository,
    private readonly account: AccountRepository,
  ) {}

  /** Evalúa el episodio con las reglas vigentes y devuelve sus señales activas. */
  async evaluate(userId: string, episodeId: string): Promise<AlarmFlag[]> {
    const episode = await this.episodes.get(userId, episodeId);
    if (!episode) return [];
    const [profile, history, auraHistorySymptoms] = await Promise.all([
      this.account.getProfile(userId),
      this.episodes.listBetween(userId, format(addDays(parseISO(episode.date), -91), 'yyyy-MM-dd'), episode.date),
      this.auraHistorySymptoms(userId, episode.id, episode.startedAt),
    ]);
    const signals = evaluateAlarmSignals(episode as AlarmEpisode, {
      pregnantOrPostpartum: profile?.pregnantOrPostpartum,
      history: history.filter((h) => h.id !== episode.id && h.startedAt < episode.startedAt),
      auraHistorySymptoms,
    });

    const current = await this.listForEpisode(userId, episodeId);
    const now = clock.now().toISOString();
    await this.db.transaction(async () => {
      for (const flag of current) {
        if (!signals.includes(flag.signal)) {
          await this.db.run(
            `UPDATE alarm_flags SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ? AND user_id = ?`,
            [now, now, flag.id, userId],
          );
        }
      }
      for (const signal of signals) {
        if (current.some((f) => f.signal === signal)) continue;
        await this.db.run(
          `INSERT INTO alarm_flags (id, user_id, created_at, updated_at, episode_id, signal, rules_version, detected_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [newId(), userId, now, now, episodeId, signal, ALARM_RULES_VERSION, now],
        );
      }
    });
    return this.listForEpisode(userId, episodeId);
  }

  async listForEpisode(userId: string, episodeId: string): Promise<AlarmFlag[]> {
    const rows = await this.db.all<Record<string, unknown>>(
      `SELECT * FROM alarm_flags WHERE user_id = ? AND episode_id = ? AND deleted_at IS NULL ORDER BY detected_at, signal`,
      [userId, episodeId],
    );
    return rows.map(toFlag);
  }

  /** Señales de los episodios que empezaron entre dos días locales (ambos incluidos). */
  async listBetween(userId: string, fromDate: string, toDate: string): Promise<AlarmFlag[]> {
    const rows = await this.db.all<Record<string, unknown>>(
      `SELECT f.* FROM alarm_flags f
       JOIN headache_episodes e ON e.id = f.episode_id AND e.deleted_at IS NULL
       WHERE f.user_id = ? AND f.deleted_at IS NULL AND e.date BETWEEN ? AND ?
       ORDER BY e.started_at, f.signal`,
      [userId, fromDate, toDate],
    );
    return rows.map(toFlag);
  }

  /** Anota que el aviso se mostró en pantalla (solo la primera vez). */
  async markShown(userId: string, episodeId: string): Promise<void> {
    const now = clock.now().toISOString();
    await this.db.run(
      `UPDATE alarm_flags SET shown_at = ?, updated_at = ?, sync_status = 'pending'
       WHERE user_id = ? AND episode_id = ? AND shown_at IS NULL AND deleted_at IS NULL`,
      [now, now, userId, episodeId],
    );
  }

  /** El usuario pulsó «Entendido»: el aviso deja de mostrarse destacado. */
  async acknowledge(userId: string, episodeId: string): Promise<void> {
    const now = clock.now().toISOString();
    await this.db.run(
      `UPDATE alarm_flags SET acknowledged_at = ?, shown_at = COALESCE(shown_at, ?), updated_at = ?, sync_status = 'pending'
       WHERE user_id = ? AND episode_id = ? AND acknowledged_at IS NULL AND deleted_at IS NULL`,
      [now, now, now, userId, episodeId],
    );
  }

  private async auraHistorySymptoms(userId: string, episodeId: string, before: string): Promise<SymptomType[]> {
    const rows = await this.db.all<{ type: string }>(
      `SELECT DISTINCT s.type FROM symptoms s
       JOIN headache_episodes e ON e.id = s.episode_id AND e.deleted_at IS NULL
       WHERE s.user_id = ? AND s.deleted_at IS NULL AND e.id != ? AND e.started_at < ?
         AND EXISTS (
           SELECT 1 FROM symptoms a
           WHERE a.episode_id = e.id AND a.type = 'aura' AND a.deleted_at IS NULL
         )`,
      [userId, episodeId, before],
    );
    return rows.map((r) => r.type as SymptomType);
  }
}
