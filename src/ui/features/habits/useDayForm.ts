/**
 * Estado de los formularios de «un registro por día» (sueño, hidratación, estado diario).
 *
 * La fecha elige el día: al cambiarla se carga lo que ya hubiera guardado ese día, o un
 * formulario vacío. Guardar crea o reemplaza el registro de ese día.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ValidationError } from '../../../domain/errors';
import type { Repositories } from '../../../data/repositories';
import { getRepositories } from '../../../state/services';
import { useSession } from '../../../state/sessionStore';
import { isIsoDate } from '../../../utils/time';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';

/** Configuración del formulario. Debe ser una constante de módulo (estable entre renders). */
export interface DayFormConfig<D extends { date: string }, R> {
  empty: (date: string) => D;
  load: (repos: Repositories, userId: string, date: string) => Promise<R | null>;
  toDraft: (record: R) => D;
  /** Mensaje del aviso al salir con cambios sin guardar. */
  unsavedMessage: string;
}

export function useDayForm<D extends { date: string }, R>(config: DayFormConfig<D, R>, initialDate: string) {
  const user = useSession((s) => s.user);
  const [draft, setDraft] = useState<D>(() => config.empty(initialDate));
  const [exists, setExists] = useState(false);
  const [loadedDate, setLoadedDate] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = useRef(false);
  const saved = useRef(false);
  useUnsavedChangesGuard(dirty, saved, config.unsavedMessage);

  const date = draft.date;
  useEffect(() => {
    if (!user || !isIsoDate(date)) return;
    let cancelled = false;
    (async () => {
      const repos = await getRepositories();
      const record = await config.load(repos, user.id, date);
      if (cancelled) return;
      setDraft(record ? config.toDraft(record) : config.empty(date));
      setExists(!!record);
      setErrors({});
      setLoadedDate(date);
      dirty.current = false;
    })().catch(() => !cancelled && setFormError('No se pudo cargar el registro de ese día.'));
    return () => {
      cancelled = true;
    };
  }, [config, user, date]);

  const loading = loadedDate !== date;

  const set = useCallback(<K extends keyof D>(key: K, value: D[K]) => {
    dirty.current = true;
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const { [key as string]: _drop, ...rest } = e;
      return rest;
    });
  }, []);

  const update = useCallback((next: (d: D) => D) => {
    dirty.current = true;
    setDraft(next);
  }, []);

  /** Ejecuta el guardado; devuelve `true` si salió bien. */
  const submit = async (action: (repos: Repositories, userId: string, draft: D) => Promise<unknown>) => {
    if (!user || saving) return false;
    setFormError(null);
    setSaving(true);
    try {
      await action(await getRepositories(), user.id, draft);
      saved.current = true;
      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        setErrors(error.fields);
        if (error.fields._form) setFormError(error.fields._form);
      } else setFormError(error instanceof Error ? error.message : 'No se pudo guardar.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { draft, set, update, exists, loading, errors, setErrors, formError, saving, submit };
}
