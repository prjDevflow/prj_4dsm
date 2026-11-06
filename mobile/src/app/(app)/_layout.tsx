import { Stack } from 'expo-router';
import { colors } from '@/theme';

// Everyone with a session. Admin-only routes get their own guard in (app)/admin/_layout.tsx (F05+).
export default function AppLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.fundo } }}
    />
  );
}
