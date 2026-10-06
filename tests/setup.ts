/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock no admite imports de módulo */
/**
 * Configuración global de las pruebas.
 * Los módulos nativos de Expo se sustituyen por equivalentes de Node.
 */
jest.mock('expo-crypto', () => ({
  randomUUID: () => require('node:crypto').randomUUID(),
  getRandomBytes: (n: number) => new Uint8Array(require('node:crypto').randomBytes(n)),
  getRandomBytesAsync: async (n: number) => new Uint8Array(require('node:crypto').randomBytes(n)),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  CryptoEncoding: { HEX: 'hex', BASE64: 'base64' },
  digestStringAsync: async (_alg: string, data: string) =>
    require('node:crypto').createHash('sha256').update(data).digest('hex'),
}));

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
    getItemAsync: async (key: string) => store.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => {
      store.set(key, value);
    },
    deleteItemAsync: async (key: string) => {
      store.delete(key);
    },
    __reset: () => store.clear(),
  };
});
