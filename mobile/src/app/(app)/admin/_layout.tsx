import { Stack } from 'expo-router';
import { useSessionStore } from '@/context/SessionStore';
import { colors } from '@/theme';

// Only ADMIN. The check is for the interface; the server answers 403 to any other profile.
export default function AdminLayout() {
  const isAdmin = useSessionStore((state) => state.usuario?.perfil === 'ADMIN');

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.fundo } }}>
      <Stack.Protected guard={isAdmin} redirectTo="/">
        <Stack.Screen name="[area]" />
      </Stack.Protected>
    </Stack>
  );
}
