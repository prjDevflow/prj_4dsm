import { useRouter } from 'expo-router';
import { useSessionStore } from '@/context/SessionStore';
import { perfilLabel } from '@/lib/perfil';
import { useLogoutModel } from '@/screens/Account/logout/logout.model';

// T13: read-only data (the contract has no profile or password change) and "Sair".
export const useAccountModel = () => {
  const router = useRouter();
  const usuario = useSessionStore((state) => state.usuario);

  return {
    nome: usuario?.nome ?? '',
    email: usuario?.email ?? '',
    perfil: usuario ? perfilLabel(usuario.perfil) : '',
    isAdmin: usuario?.perfil === 'ADMIN',
    onBack: () => (router.canGoBack() ? router.back() : router.replace('/')),
    ...useLogoutModel(),
  };
};
