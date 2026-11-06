import * as SecureStore from 'expo-secure-store';

export const TOKEN_KEY = 'session.accessToken';

export const tokenStorage = {
  load: () => SecureStore.getItemAsync(TOKEN_KEY),
  save: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};
