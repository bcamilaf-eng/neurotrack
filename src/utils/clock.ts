/**
 * Reloj inyectable: la app usa la hora real y las pruebas pueden fijarla.
 */
export const clock = {
  now: (): Date => new Date(),
};

export function setClock(now: () => Date): void {
  clock.now = now;
}

export function resetClock(): void {
  clock.now = () => new Date();
}
