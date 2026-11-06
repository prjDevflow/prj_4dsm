import { Stack } from 'expo-router';
import { useSessionStore } from '@/context/SessionStore';
import { colors } from '@/theme';

// Only ADMIN. The check is for the interface; the server answers 403 to any other profile.
export default function AdminLayout() {
  const isAdmin = useSessionStore((state) => state.usuario?.perfil === 'ADMIN');

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.fundo } }}>
      <Stack.Protected guard={isAdmin} redirectTo="/">
        <Stack.Screen name="users/index" />
        <Stack.Screen name="users/new" />
        <Stack.Screen name="users/[id]" />
        <Stack.Screen name="locations/index" />
        <Stack.Screen name="locations/buildings/new" />
        <Stack.Screen name="locations/buildings/[id]" />
        <Stack.Screen name="locations/points/new" />
        <Stack.Screen name="locations/points/[id]" />
        <Stack.Screen name="terminals/index" />
        <Stack.Screen name="terminals/new" />
        <Stack.Screen name="terminals/[id]" />
        <Stack.Screen name="authorizations/new" />
        <Stack.Screen name="[area]" />
      </Stack.Protected>
    </Stack>
  );
}
