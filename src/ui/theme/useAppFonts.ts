/**
 * Carga las fuentes de la app sin bloquear el arranque: si tardan más de
 * `FONT_TIMEOUT_MS` o fallan, la app sigue con las del sistema.
 */
import { loadAsync } from 'expo-font';
import { useEffect, useState } from 'react';
import { FONT_ASSETS } from './fonts';

const FONT_TIMEOUT_MS = 4000;

export function useAppFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    const done = () => {
      if (active) setReady(true);
    };
    const timer = setTimeout(done, FONT_TIMEOUT_MS);
    loadAsync(FONT_ASSETS)
      .catch((error: unknown) => console.warn('No se pudieron cargar las fuentes', error))
      .finally(() => {
        clearTimeout(timer);
        done();
      });
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);
  return ready;
}
