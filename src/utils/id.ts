import * as Crypto from 'expo-crypto';

/** Identificador UUID v4 generado en el dispositivo, válido también sin conexión. */
export function newId(): string {
  return Crypto.randomUUID();
}
