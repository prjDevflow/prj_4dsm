import { useRouter } from 'expo-router';
import { services } from '@/service/container';
import { useUsersListModel } from './usersList.model';
import { UsersListView } from './usersList.view';

export const UsersListPage = () => {
  const router = useRouter();
  const methods = useUsersListModel({ listUsersService: services.listUsers });

  return (
    <UsersListView
      {...methods}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onNew={() => router.push('/admin/users/new')}
      onOpenUser={(id) => router.push({ pathname: '/admin/users/[id]', params: { id } })}
    />
  );
};
