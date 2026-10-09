/**
 * Almacenamiento de la sesión de Supabase en el almacén seguro del sistema.
 *
 * SecureStore limita cada valor a unos 2 KB y la sesión puede ser mayor, así que el
 * valor se trocea en fragmentos de 1800 caracteres guardados bajo claves numeradas.
 */
import * as SecureStore from 'expo-secure-store';

const CHUNK = 1800;
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
// SecureStore solo admite claves alfanuméricas, «.», «-» y «_».
const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    const base = safeKey(key);
    const count = await SecureStore.getItemAsync(`${base}.count`, options);
    if (!count) return null;
    const parts: string[] = [];
    for (let i = 0; i < Number(count); i += 1) {
      const part = await SecureStore.getItemAsync(`${base}.${i}`, options);
      if (part === null) return null;
      parts.push(part);
    }
    return parts.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    const base = safeKey(key);
    await this.removeItem(key);
    const total = Math.ceil(value.length / CHUNK);
    for (let i = 0; i < total; i += 1) {
      await SecureStore.setItemAsync(`${base}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK), options);
    }
    await SecureStore.setItemAsync(`${base}.count`, String(total), options);
  },

  async removeItem(key: string): Promise<void> {
    const base = safeKey(key);
    const count = await SecureStore.getItemAsync(`${base}.count`, options);
    await SecureStore.deleteItemAsync(`${base}.count`, options);
    for (let i = 0; i < Number(count ?? 0); i += 1) {
      await SecureStore.deleteItemAsync(`${base}.${i}`, options);
    }
  },
};
