import { useNetInfo } from '@react-native-community/netinfo';
import { useRouter, type Href } from 'expo-router';
import { useSessionStore } from '@/context/SessionStore';
import { useLogoutModel } from '@/screens/Account/logout/logout.model';

export type AdminArea = 'autorizacoes' | 'usuarios' | 'locais' | 'tags' | 'historico';

// Areas that already have their screens; the others open "Em breve" (/admin/[area]).
const areaRoutes: Partial<Record<AdminArea, Href>> = {
  autorizacoes: '/admin/authorizations',
  usuarios: '/admin/users',
  locais: '/admin/locations',
  historico: '/admin/history',
};

// T14: home of the administrator.
export const useAdminHomeModel = () => {
  const router = useRouter();
  const nome = useSessionStore((state) => state.usuario?.nome ?? '');
  const { isConnected } = useNetInfo();

  return {
    nome,
    isOffline: isConnected === false,
    onOpenAccount: () => router.push('/me/account'),
    onOpenArea: (area: AdminArea) => router.push(areaRoutes[area] ?? `/admin/${area}`),
    onOpenScanner: () => router.push('/access/scanner'),
    ...useLogoutModel(),
  };
};
