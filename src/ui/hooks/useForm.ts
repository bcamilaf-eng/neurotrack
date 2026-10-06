/**
 * Estado mínimo de formulario: valores, errores por campo, error general y envío.
 * Convierte los errores de dominio (`ValidationError`, `AuthError`) en mensajes visibles.
 */
import { useCallback, useState } from 'react';
import { ValidationError } from '../../domain/errors';
import { AuthError } from '../../services/auth/types';

export function useForm<T extends Record<string, unknown>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    setErrors((e) => {
      if (!e[key as string]) return e;
      const { [key as string]: _removed, ...rest } = e;
      return rest;
    });
  }, []);

  const submit = useCallback(
    async (action: (values: T) => Promise<void>) => {
      if (submitting) return false;
      setSubmitting(true);
      setFormError(null);
      try {
        await action(values);
        setErrors({});
        setDirty(false);
        return true;
      } catch (error) {
        if (error instanceof ValidationError) {
          setErrors(error.fields);
          if (error.fields._form) setFormError(error.fields._form);
        } else if (error instanceof AuthError || error instanceof Error) {
          setFormError(error.message);
        } else {
          setFormError('Algo salió mal. Inténtalo de nuevo.');
        }
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, values],
  );

  return { values, setValues, setField, errors, formError, setFormError, submitting, submit, dirty };
}
