import { useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/context/SessionStore';
import { firstName, perfilLabel } from '@/lib/perfil';

// Provisional home (F03) so each profile has somewhere to land; F04 replaces it with T03 and T14.
export const useProvisionalHomeModel = () => {
  const usuario = useSessionStore((state) => state.usuario);
  const signOut = useSessionStore((state) => state.signOut);
  const queryClient = useQueryClient();
  const isAdmin = usuario?.perfil === 'ADMIN';

  const onSignOut = async () => {
    await signOut();
    // Nothing of the previous person may stay in the cache.
    queryClient.clear();
  };

  return {
    isAdmin,
    title: isAdmin ? 'Administração' : 'Início',
    greeting: `Olá, ${firstName(usuario?.nome ?? '')}`,
    perfil: usuario ? perfilLabel(usuario.perfil) : '',
    email: usuario?.email ?? '',
    onSignOut,
  };
};
