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

// Network state: online by default; tests override useNetInfo when they need offline.
jest.mock('@react-native-community/netinfo', () =>
  jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock.js'),
);

// expo-camera has no native side under Jest: the camera is a plain view, and a test "reads" a QR by
// firing `barcodeScanned` on it. The permission is granted unless a test says otherwise.
jest.mock('expo-camera', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Camera: {
      getCameraPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
      requestCameraPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
    },
    CameraView: (props: object) => createElement(View, { testID: 'camera', ...props }),
  };
});

// expo-location has no native side under Jest: the permission is granted and the phone is at the
// turnstile of the seed, unless a test says otherwise.
jest.mock('expo-location', () => ({
  Accuracy: { High: 4 },
  getForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: { latitude: -23.30512, longitude: -45.96551, accuracy: 12.5 },
  })),
}));

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
