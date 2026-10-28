import { server } from '@test/msw/server';

declare global {
  var __nodeFetch: Pick<typeof globalThis, 'fetch' | 'Request' | 'Response' | 'Headers'>;
}

// Node's fetch (see test/environment.js) must be in place before MSW patches it in listen().
for (const [name, value] of Object.entries(globalThis.__nodeFetch)) {
  Object.defineProperty(globalThis, name, { value, writable: true, configurable: true });
}

// In-memory expo-secure-store: the native module does not exist under Jest.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

// Fonts (Atkinson and the icon font) count as loaded: there are no font files under Jest.
jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  loadAsync: jest.fn(async () => {}),
  isLoaded: jest.fn(() => true),
  useFonts: jest.fn(() => [true, null]),
}));

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
