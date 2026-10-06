/**
 * Cuenta, perfil opcional, contacto de emergencia y consentimientos.
 *
 * Minimización de datos: para crear la cuenta solo se piden email y contraseña;
 * todo lo demás es opcional.
 */
import { z } from 'zod';
import { CONSENT_TYPE_CODES, SEX_CODES } from '../catalogs';
import { numberInRange, optionalText, pastOrTodayDate } from '../validation/common';
import { ageFromBirthDate } from '../../utils/time';
import { clock } from '../../utils/clock';

export const PASSWORD_MIN_LENGTH = 10;

export const emailSchema = z
  .string({ error: 'Introduce tu email.' })
  .trim()
  .toLowerCase()
  .pipe(z.email('Introduce un email válido.'));

export const passwordSchema = z
  .string({ error: 'Introduce una contraseña.' })
  .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`)
  .max(128, 'La contraseña es demasiado larga.')
  .refine((v) => /[A-Za-zÀ-ÿ]/.test(v) && /\d/.test(v), 'Incluye al menos una letra y un número.');

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden.',
  });

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Introduce tu contraseña.'),
});

export const profileInputSchema = z.object({
  name: optionalText(80),
  birthDate: pastOrTodayDate
    .refine((d) => ageFromBirthDate(d, clock.now()) <= 120, 'Revisa la fecha de nacimiento.')
    .optional(),
  sex: z.enum(SEX_CODES).optional(),
  weightKg: numberInRange(20, 300).optional(),
  heightCm: numberInRange(50, 250).optional(),
  country: optionalText(60),
  trackingNotes: optionalText(1000),
  pregnantOrPostpartum: z.boolean().optional(),
});

export type ProfileInput = z.input<typeof profileInputSchema>;
export type ProfileData = z.output<typeof profileInputSchema>;

export const emergencyContactInputSchema = z.object({
  name: z.string().trim().min(1, 'Indica el nombre.').max(80),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{6,20}$/, 'Introduce un teléfono válido.'),
  relationship: optionalText(40),
});

export type EmergencyContactInput = z.input<typeof emergencyContactInputSchema>;

export const consentDecisionSchema = z.object({
  type: z.enum(CONSENT_TYPE_CODES),
  accepted: z.boolean(),
  version: z.string().min(1),
});

export type ConsentDecision = z.output<typeof consentDecisionSchema>;
