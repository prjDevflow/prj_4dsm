import { useNetInfo } from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import { useSessionStore } from '@/context/SessionStore';
import { firstName } from '@/lib/perfil';
import { useLogoutModel } from '@/screens/Account/logout/logout.model';

// T03: home of the condômino and the visitante.
export const useUserHomeModel = () => {
  const router = useRouter();
  const nome = useSessionStore((state) => state.usuario?.nome ?? '');
  const { isConnected } = useNetInfo();

  return {
    nome,
    greeting: `Olá, ${firstName(nome)}`,
    isOffline: isConnected === false,
    onOpenAccount: () => router.push('/me/account'),
    onOpenScanner: () => router.push('/em-breve/catraca'),
    onOpenAuthorizations: () => router.push('/em-breve/minhas-autorizacoes'),
    onOpenHistory: () => router.push('/em-breve/meu-historico'),
    ...useLogoutModel(),
  };
};
