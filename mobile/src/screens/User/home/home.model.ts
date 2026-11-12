import { useNetInfo } from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import { useSessionStore } from '@/context/SessionStore';
import { firstName } from '@/lib/perfil';
import { useLogoutModel } from '@/screens/Account/logout/logout.model';
import type { IListMyAuthorizationsService } from '@/service/IAuthorizationService';
import { useMyAuthorizationsQuery } from '../authorizations/myAuthorizationsQuery';

type UserHomeModelProps = { listMyAuthorizationsService: IListMyAuthorizationsService };

// T03: home of the condômino and the visitante.
export const useUserHomeModel = ({ listMyAuthorizationsService }: UserHomeModelProps) => {
  const router = useRouter();
  const nome = useSessionStore((state) => state.usuario?.nome ?? '');
  const { isConnected } = useNetInfo();
  const { data: authorizations = [] } = useMyAuthorizationsQuery(listMyAuthorizationsService);

  return {
    nome,
    greeting: `Olá, ${firstName(nome)}`,
    isOffline: isConnected === false,
    activeCount: authorizations.filter((a) => a.situacaoEfetiva === 'ATIVA').length,
    onOpenAccount: () => router.push('/me/account'),
    onOpenScanner: () => router.push('/access/scanner'),
    onOpenAuthorizations: () => router.push('/me/authorizations'),
    onOpenHistory: () => router.push('/me/history'),
    ...useLogoutModel(),
  };
};
