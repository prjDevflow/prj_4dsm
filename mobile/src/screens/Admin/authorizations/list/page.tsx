import { useRouter } from 'expo-router';
import { services } from '@/service/container';
import { useAuthorizationsListModel } from './authorizationsList.model';
import { AuthorizationsListView } from './authorizationsList.view';

export const AuthorizationsListPage = () => {
  const router = useRouter();
  const methods = useAuthorizationsListModel({
    listAuthorizationsService: services.listAuthorizations,
    listUsersService: services.listUsers,
    listBuildingsService: services.listBuildings,
    listAccessPointsService: services.listAccessPoints,
  });

  return (
    <AuthorizationsListView
      {...methods}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onNew={() => router.push('/admin/authorizations/new')}
      onOpen={(id) => router.push({ pathname: '/admin/authorizations/[id]', params: { id } })}
    />
  );
};
