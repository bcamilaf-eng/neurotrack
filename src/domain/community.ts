/**
 * Comunidad: foros donde personas con migraña comparten consejos y experiencias.
 *
 * Reglas de diseño:
 * - Cada persona participa con un seudónimo; nunca se muestra su email ni sus registros.
 * - Los textos no pueden contener emails ni teléfonos (datos personales).
 * - Lo que se publica es experiencia personal, no indicación médica.
 * - Un tema o respuesta con varios reportes se oculta hasta que alguien lo revise.
 */
import { z } from 'zod';
import type { Catalog } from './catalogs';
import { msg } from './validation/common';

export const COMMUNITY_CATEGORIES = [
  { code: 'tips', label: 'Consejos', description: 'Lo que a ti te funciona en el día a día.' },
  { code: 'experiences', label: 'Experiencias', description: 'Cuenta cómo vives la migraña.' },
  { code: 'questions', label: 'Preguntas', description: 'Pregunta a otras personas que la viven.' },
  { code: 'support', label: 'Apoyo', description: 'Para los días difíciles.' },
] as const;
export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number]['code'];
export const COMMUNITY_CATEGORY_CODES = COMMUNITY_CATEGORIES.map((c) => c.code) as [
  CommunityCategory,
  ...CommunityCategory[],
];

export function categoryLabel(code: CommunityCategory): string {
  return COMMUNITY_CATEGORIES.find((c) => c.code === code)?.label ?? code;
}

export const REPORT_REASONS = [
  { code: 'medical_advice', label: 'Receta o recomienda medicamentos' },
  { code: 'personal_data', label: 'Publica datos personales' },
  { code: 'offensive', label: 'Ofensivo o irrespetuoso' },
  { code: 'spam', label: 'Spam o publicidad' },
  { code: 'other', label: 'Otro motivo' },
] as const satisfies Catalog<string>;
export type ReportReason = (typeof REPORT_REASONS)[number]['code'];
const REPORT_REASON_CODES = REPORT_REASONS.map((r) => r.code) as [ReportReason, ...ReportReason[]];

/** Reportes de personas distintas que ocultan un tema o respuesta. */
export const REPORT_HIDE_THRESHOLD = 3;

/** Cambiar la versión vuelve a pedir que se acepten las normas. */
export const COMMUNITY_RULES_VERSION = '2026-10';

export const COMMUNITY_RULES = [
  'Comparte tu experiencia, no indicaciones médicas: no recetes, no recomiendes dosis ni cambios de tratamiento.',
  'Respeta a todas las personas. Cada migraña es distinta.',
  'Protege tu privacidad y la de otros: no publiques nombres reales, emails, teléfonos ni direcciones.',
  'Nada de publicidad ni enlaces a productos.',
  'Si algo no cumple estas normas, repórtalo. Con varios reportes se oculta hasta revisarlo.',
];

export const COMMUNITY_NOTICE =
  'Lo que se comparte aquí son experiencias personales, no consejos médicos. Ante cualquier duda sobre tu tratamiento, consulta a tu profesional de salud.';

const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
// Siete o más dígitos seguidos, admitiendo espacios, guiones, puntos y paréntesis entre ellos.
const PHONE = /(?:\+?\d[\s().-]?){7,}/;
// Las fechas (2026-10-06, 06-10-2026, 6.10.26) no son teléfonos.
const DATE = /\b(?:\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[-.]\d{1,2}[-.]\d{2,4})\b/g;

/** Indica si un texto contiene un email o un teléfono. */
export function containsContactData(text: string): boolean {
  return EMAIL.test(text) || PHONE.test(text.replace(DATE, ' '));
}

const PRIVACY_MESSAGE = 'Por tu privacidad, no incluyas emails ni teléfonos.';

const publicText = (min: number, max: number, minMessage: string) =>
  z
    .string({ error: msg.required })
    .trim()
    .min(min, minMessage)
    .max(max, msg.tooLong(max))
    .refine((text) => !containsContactData(text), PRIVACY_MESSAGE);

export const aliasSchema = z
  .string({ error: msg.required })
  .trim()
  .min(3, 'El seudónimo debe tener al menos 3 caracteres.')
  .max(24, msg.tooLong(24))
  .regex(/^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u, 'Usa letras, números, espacios, puntos o guiones.')
  .refine((alias) => !alias.includes('@') && !containsContactData(alias), PRIVACY_MESSAGE);

export const joinCommunitySchema = z.object({
  alias: aliasSchema,
  acceptedRules: z.literal(true, { error: 'Acepta las normas de la comunidad para continuar.' }),
});
export type JoinCommunityInput = z.input<typeof joinCommunitySchema>;

export const postInputSchema = z.object({
  category: z.enum(COMMUNITY_CATEGORY_CODES, { error: 'Elige una categoría.' }),
  title: publicText(5, 120, 'El título debe tener al menos 5 caracteres.'),
  body: publicText(10, 4000, 'Escribe al menos 10 caracteres.'),
});
export type PostInput = z.input<typeof postInputSchema>;

export const replyInputSchema = z.object({
  body: publicText(2, 2000, 'Escribe tu respuesta.'),
});
export type ReplyInput = z.input<typeof replyInputSchema>;

export const reportInputSchema = z.object({
  reason: z.enum(REPORT_REASON_CODES, { error: 'Elige un motivo.' }),
});
export type ReportInput = z.input<typeof reportInputSchema>;

export interface CommunityProfile {
  userId: string;
  alias: string;
  rulesVersion: string;
}

export interface CommunityPost {
  id: string;
  category: CommunityCategory;
  title: string;
  body: string;
  authorAlias: string;
  createdAt: string;
  replyCount: number;
  /** Lo escribió quien está mirando: puede borrarlo y no puede reportarlo. */
  mine: boolean;
}

export interface CommunityReply {
  id: string;
  postId: string;
  body: string;
  authorAlias: string;
  createdAt: string;
  mine: boolean;
}

export type ReportTarget = { kind: 'post' | 'reply'; id: string };
