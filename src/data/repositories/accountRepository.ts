/**
 * Datos de la cuenta en el dispositivo: perfil, ajustes, contacto de emergencia y
 * consentimientos, además de la eliminación completa de los datos del usuario.
 */
import {
  CURRENT_CONSENT_VERSION,
  REQUIRED_CONSENTS,
  type ConsentType,
} from '../../domain/catalogs';
import {
  type ConsentDecision,
  type EmergencyContactInput,
  type ProfileData,
  type ProfileInput,
  consentDecisionSchema,
  emergencyContactInputSchema,
  profileInputSchema,
} from '../../domain/entities/user';
import { parseOrThrow } from '../../domain/errors';
import { clock } from '../../utils/clock';
import { newId } from '../../utils/id';
import { CLINICAL_TABLES } from '../db/migrations';
import type { SqlDatabase } from '../db/types';
import { type ColumnMap, objectToColumns, rowToObject } from './mapping';

export interface UserSettings {
  theme: 'system' | 'light' | 'dark';
  textScale: number;
  biometricLock: boolean;
  lockAfterMinutes: number;
  reminders: Record<string, unknown>;
  language: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  textScale: 1,
  biometricLock: false,
  lockAfterMinutes: 5,
  reminders: {},
  language: 'es',
};

export type Profile = ProfileData & { id: string; email: string };

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship?: string;
}

const PROFILE_COLUMNS: ColumnMap<ProfileData> = {
  name: { column: 'name', kind: 'text' },
  birthDate: { column: 'birth_date', kind: 'text' },
  sex: { column: 'sex', kind: 'text' },
  weightKg: { column: 'weight_kg', kind: 'real' },
  heightCm: { column: 'height_cm', kind: 'real' },
  country: { column: 'country', kind: 'text' },
  trackingNotes: { column: 'tracking_notes', kind: 'text' },
  pregnantOrPostpartum: { column: 'pregnant_or_postpartum', kind: 'bool' },
};

export class AccountRepository {
  constructor(private readonly db: SqlDatabase) {}

  /** Crea la fila local del usuario tras iniciar sesión, si aún no existe. */
  async ensureUser(userId: string, email: string): Promise<void> {
    const now = clock.now().toISOString();
    await this.db.run(
      `INSERT INTO users (id, email, created_at, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET email = excluded.email`,
      [userId, email, now, now],
    );
    await this.db.run(
      `INSERT INTO user_settings (user_id, updated_at) VALUES (?, ?) ON CONFLICT(user_id) DO NOTHING`,
      [userId, now],
    );
  }

  async getProfile(userId: string): Promise<Profile | null> {
    const row = await this.db.first<Record<string, unknown>>(`SELECT * FROM users WHERE id = ?`, [userId]);
    if (!row) return null;
    return {
      ...(rowToObject(row, PROFILE_COLUMNS) as ProfileData),
      id: String(row.id),
      email: String(row.email),
    };
  }

  async updateProfile(userId: string, input: ProfileInput): Promise<Profile> {
    const data = parseOrThrow(profileInputSchema, input);
    const { columns, values } = objectToColumns(data, PROFILE_COLUMNS);
    await this.db.run(
      `UPDATE users SET ${columns.map((c) => `${c} = ?`).join(', ')}, updated_at = ?, sync_status = 'pending'
       WHERE id = ?`,
      [...values, clock.now().toISOString(), userId],
    );
    const profile = await this.getProfile(userId);
    if (!profile) throw new Error('Perfil no encontrado.');
    return profile;
  }

  async getSettings(userId: string): Promise<UserSettings> {
    const row = await this.db.first<Record<string, unknown>>(
      `SELECT * FROM user_settings WHERE user_id = ?`,
      [userId],
    );
    if (!row) return DEFAULT_SETTINGS;
    let reminders: Record<string, unknown> = {};
    try {
      reminders = JSON.parse(String(row.reminders));
    } catch {
      reminders = {};
    }
    return {
      theme: row.theme as UserSettings['theme'],
      textScale: Number(row.text_scale),
      biometricLock: row.biometric_lock === 1,
      lockAfterMinutes: Number(row.lock_after_minutes),
      reminders,
      language: String(row.language),
    };
  }

  async updateSettings(userId: string, patch: Partial<UserSettings>): Promise<UserSettings> {
    const next = { ...(await this.getSettings(userId)), ...patch };
    await this.db.run(
      `UPDATE user_settings SET theme = ?, text_scale = ?, biometric_lock = ?, lock_after_minutes = ?,
         reminders = ?, language = ?, updated_at = ?
       WHERE user_id = ?`,
      [
        next.theme,
        next.textScale,
        next.biometricLock ? 1 : 0,
        next.lockAfterMinutes,
        JSON.stringify(next.reminders),
        next.language,
        clock.now().toISOString(),
        userId,
      ],
    );
    return next;
  }

  // ── Contacto de emergencia (uno por usuario) ─────────────────────────────

  async getEmergencyContact(userId: string): Promise<EmergencyContact | null> {
    const row = await this.db.first<Record<string, unknown>>(
      `SELECT * FROM emergency_contacts WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );
    if (!row) return null;
    return {
      id: String(row.id),
      name: String(row.name),
      phone: String(row.phone),
      relationship: row.relationship ? String(row.relationship) : undefined,
    };
  }

  async saveEmergencyContact(userId: string, input: EmergencyContactInput): Promise<EmergencyContact> {
    const data = parseOrThrow(emergencyContactInputSchema, input);
    const now = clock.now().toISOString();
    await this.db.transaction(async () => {
      await this.removeEmergencyContact(userId, now);
      await this.db.run(
        `INSERT INTO emergency_contacts (id, user_id, created_at, updated_at, name, phone, relationship)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [newId(), userId, now, now, data.name, data.phone, data.relationship ?? null],
      );
    });
    return (await this.getEmergencyContact(userId))!;
  }

  async removeEmergencyContact(userId: string, now = clock.now().toISOString()): Promise<void> {
    await this.db.run(
      `UPDATE emergency_contacts SET deleted_at = ?, updated_at = ?, sync_status = 'pending'
       WHERE user_id = ? AND deleted_at IS NULL`,
      [now, now, userId],
    );
  }

  // ── Consentimientos ──────────────────────────────────────────────────────

  /** Guarda cada decisión como una fila nueva: el historial no se sobrescribe. */
  async recordConsents(userId: string, decisions: ConsentDecision[]): Promise<void> {
    const now = clock.now().toISOString();
    const parsed = decisions.map((d) => parseOrThrow(consentDecisionSchema, d));
    await this.db.transaction(async () => {
      for (const decision of parsed) {
        await this.db.run(
          `INSERT INTO consents (id, user_id, created_at, updated_at, type, version, accepted, decided_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [newId(), userId, now, now, decision.type, decision.version, decision.accepted ? 1 : 0, now],
        );
      }
    });
  }

  /** Última decisión por tipo de consentimiento. */
  async currentConsents(userId: string): Promise<Partial<Record<ConsentType, ConsentDecision>>> {
    const rows = await this.db.all<{ type: ConsentType; version: string; accepted: number }>(
      `SELECT c.type, c.version, c.accepted FROM consents c
       WHERE c.user_id = ? AND c.deleted_at IS NULL
         AND c.decided_at = (SELECT MAX(decided_at) FROM consents x
                             WHERE x.user_id = c.user_id AND x.type = c.type AND x.deleted_at IS NULL)
       ORDER BY c.created_at`,
      [userId],
    );
    const out: Partial<Record<ConsentType, ConsentDecision>> = {};
    for (const row of rows) out[row.type] = { type: row.type, version: row.version, accepted: row.accepted === 1 };
    return out;
  }

  /** ¿Aceptó el usuario los consentimientos obligatorios en su versión vigente? */
  async hasRequiredConsents(userId: string): Promise<boolean> {
    const current = await this.currentConsents(userId);
    return REQUIRED_CONSENTS.every(
      (type) => current[type]?.accepted && current[type]?.version === CURRENT_CONSENT_VERSION,
    );
  }

  /**
   * Elimina de forma definitiva todos los datos del usuario en este dispositivo.
   * `keepAccount` conserva la fila de usuario y sus ajustes (eliminar datos ≠ eliminar cuenta).
   */
  async deleteAllData(userId: string, options: { keepAccount: boolean }): Promise<void> {
    await this.db.transaction(async () => {
      for (const table of CLINICAL_TABLES) {
        if (options.keepAccount && table === 'consents') continue;
        await this.db.run(`DELETE FROM ${table} WHERE user_id = ?`, [userId]);
      }
      if (!options.keepAccount) {
        await this.db.run(`DELETE FROM user_settings WHERE user_id = ?`, [userId]);
        await this.db.run(`DELETE FROM users WHERE id = ?`, [userId]);
      }
    });
  }
}
