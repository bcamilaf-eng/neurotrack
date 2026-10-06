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

/** Sistema de archivos en memoria con la API de clases de expo-file-system. */
jest.mock('expo-file-system', () => {
  const files = new Map<string, string>();
  const dirs = new Set<string>();
  const join = (parts: unknown[]) => parts.map((p) => (typeof p === 'string' ? p : (p as { uri: string }).uri)).join('/');
  class Directory {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    get exists() {
      return dirs.has(this.uri) || [...files.keys()].some((k) => k.startsWith(`${this.uri}/`));
    }
    create() {
      dirs.add(this.uri);
    }
    delete() {
      for (const key of [...files.keys()]) if (key.startsWith(`${this.uri}/`)) files.delete(key);
      dirs.delete(this.uri);
    }
  }
  class File {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    get exists() {
      return files.has(this.uri);
    }
    create() {
      files.set(this.uri, '');
    }
    write(content: string) {
      files.set(this.uri, String(content));
    }
    textSync() {
      return files.get(this.uri) ?? '';
    }
    delete() {
      files.delete(this.uri);
    }
    async move(destination: { uri: string }) {
      files.set(destination.uri, files.get(this.uri) ?? '');
      files.delete(this.uri);
      this.uri = destination.uri;
    }
  }
  return { File, Directory, Paths: { cache: new Directory('file:///cache') }, __files: files };
});

jest.mock('expo-print', () => ({
  printToFileAsync: async ({ html }: { html: string }) => {
    const uri = `file:///cache/Print/${require('node:crypto').randomUUID()}.pdf`;
    require('expo-file-system').__files.set(uri, `PDF:${html}`);
    return { uri, numberOfPages: 1 };
  },
}));

/** Guarda qué archivo se compartió y su contenido en ese momento. */
jest.mock('expo-sharing', () => {
  const shared: { uri: string; content: string | undefined; options: unknown }[] = [];
  return {
    isAvailableAsync: async () => true,
    shareAsync: jest.fn(async (uri: string, options: unknown) => {
      shared.push({ uri, content: require('expo-file-system').__files.get(uri), options });
    }),
    __shared: shared,
  };
});

jest.mock('expo-notifications', () => {
  const scheduled: { identifier: string; content: unknown; trigger: unknown }[] = [];
  const permission = { granted: true, canAskAgain: true };
  return {
    SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
    AndroidImportance: { DEFAULT: 3 },
    AndroidNotificationVisibility: { PRIVATE: 2 },
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn(async () => null),
    getPermissionsAsync: jest.fn(async () => ({ ...permission })),
    requestPermissionsAsync: jest.fn(async () => ({ ...permission })),
    getAllScheduledNotificationsAsync: async () => scheduled.map((n) => ({ ...n })),
    cancelScheduledNotificationAsync: async (id: string) => {
      const i = scheduled.findIndex((n) => n.identifier === id);
      if (i >= 0) scheduled.splice(i, 1);
    },
    scheduleNotificationAsync: async (request: { identifier: string; content: unknown; trigger: unknown }) => {
      scheduled.push(request);
      return request.identifier;
    },
    __scheduled: scheduled,
    __permission: permission,
  };
});
