import { useRouter } from 'expo-router';
import { services } from '@/service/container';
import { useMyHistoryModel } from './myHistory.model';
import { MyHistoryView } from './myHistory.view';

export const MyHistoryPage = () => {
  const router = useRouter();
  const methods = useMyHistoryModel({ listMyAccessEventsService: services.listMyAccessEvents });

  return (
    <MyHistoryView
      {...methods}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
    />
  );
};
