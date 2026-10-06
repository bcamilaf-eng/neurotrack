import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { clock } from '../../utils/clock';
import { isIsoDate, toLocalDate } from '../../utils/time';

/** Día pedido por la ruta (`?fecha=AAAA-MM-DD`) o, si no hay uno válido, hoy. */
export function useDayParam(): string {
  const { fecha } = useLocalSearchParams<{ fecha?: string }>();
  const [day] = useState(() => (fecha && isIsoDate(fecha) ? fecha : toLocalDate(clock.now())));
  return day;
}
