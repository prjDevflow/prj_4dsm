import {
  AtkinsonHyperlegibleNext_400Regular,
  AtkinsonHyperlegibleNext_700Bold,
  AtkinsonHyperlegibleNext_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/atkinson-hyperlegible-next';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ToastProvider } from '@/components/ui';
import { useSessionStore } from '@/context/SessionStore';
import { colors, ThemeProvider } from '@/theme';

// The native splash stays until the fonts load, so no screen flashes with the system font.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 }, mutations: { retry: 0 } },
});

export default function RootLayout() {
  const usuario = useSessionStore((state) => state.usuario);
  const [fontsLoaded, fontError] = useFonts({
    AtkinsonHyperlegibleNext_400Regular,
    AtkinsonHyperlegibleNext_700Bold,
    AtkinsonHyperlegibleNext_800ExtraBold,
    ...MaterialIcons.font,
  });
  // On a font error the app still opens, with the system font.
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <StatusBar style="light" />
          {/* Guards by session: the login and the app never stay in the same stack, so "back"
              never returns to the login. Every Protected has redirectTo; free screens go last. */}
          <Stack
            screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.fundo } }}
          >
            <Stack.Protected guard={!usuario} redirectTo="/">
              <Stack.Screen name="login" />
            </Stack.Protected>
            <Stack.Protected guard={!!usuario} redirectTo="/login">
              <Stack.Screen name="(app)" />
            </Stack.Protected>
            <Stack.Screen name="health" />
            <Stack.Screen name="catalog" />
          </Stack>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
