import { useRouter } from 'expo-router';
import { services } from '@/service/container';
import { useAccessHistoryModel } from './accessHistory.model';
import { AccessHistoryView } from './accessHistory.view';

export const AccessHistoryPage = () => {
  const router = useRouter();
  const methods = useAccessHistoryModel({
    listAccessEventsService: services.listAccessEvents,
    listUsersService: services.listUsers,
    listBuildingsService: services.listBuildings,
    listAccessPointsService: services.listAccessPoints,
  });

  return (
    <AccessHistoryView
      {...methods}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onOpen={(id) => router.push({ pathname: '/admin/history/[id]', params: { id } })}
    />
  );
};
