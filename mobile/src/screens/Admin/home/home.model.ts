import { useNetInfo } from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import { useSessionStore } from '@/context/SessionStore';
import { useLogoutModel } from '@/screens/Account/logout/logout.model';

export type AdminArea = 'autorizacoes' | 'usuarios' | 'locais' | 'tags' | 'historico';

// T14: home of the administrator. The areas open "Em breve" screens until F05 onwards.
export const useAdminHomeModel = () => {
  const router = useRouter();
  const nome = useSessionStore((state) => state.usuario?.nome ?? '');
  const { isConnected } = useNetInfo();

  return {
    nome,
    isOffline: isConnected === false,
    onOpenAccount: () => router.push('/me/account'),
    onOpenArea: (area: AdminArea) => router.push(`/admin/${area}`),
    onOpenScanner: () => router.push('/em-breve/catraca'),
    ...useLogoutModel(),
  };
};
