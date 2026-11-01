import { useSessionStore } from '@/context/SessionStore';
import { AdminHomePage } from '@/screens/Admin/home/page';
import { UserHomePage } from '@/screens/User/home/page';

/** T14 for the administrator, T03 for condômino and visitante. */
export const HomePage = () => {
  const isAdmin = useSessionStore((state) => state.usuario?.perfil === 'ADMIN');
  return isAdmin ? <AdminHomePage /> : <UserHomePage />;
};
