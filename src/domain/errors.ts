/**
 * Errores de dominio con mensajes listos para mostrar al usuario.
 */
import type { z } from 'zod';
import { fieldErrors } from './validation/common';

export class ValidationError extends Error {
  readonly fields: Record<string, string>;
  constructor(fields: Record<string, string>) {
    super(Object.values(fields)[0] ?? 'Revisa los datos introducidos.');
    this.name = 'ValidationError';
    this.fields = fields;
  }
  static fromZod(error: z.ZodError): ValidationError {
    return new ValidationError(fieldErrors(error));
  }
}

export class NotFoundError extends Error {
  constructor(what = 'El registro') {
    super(`${what} no existe o fue eliminado.`);
    this.name = 'NotFoundError';
  }
}

/** Ya existe un registro equivalente (mismo día o episodio solapado). */
export class DuplicateError extends Error {
  readonly existingId: string;
  constructor(message: string, existingId: string) {
    super(message);
    this.name = 'DuplicateError';
    this.existingId = existingId;
  }
}

/** Valida con Zod y lanza `ValidationError` con mensajes por campo. */
export function parseOrThrow<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw ValidationError.fromZod(result.error);
  return result.data;
}
