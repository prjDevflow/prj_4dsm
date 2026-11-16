import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAccessEventDetail } from './accessEventDetail.model';
import { AccessEventDetailView } from './accessEventDetail.view';

export const AccessEventDetailPage = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { event } = useAccessEventDetail(id);

  return (
    <AccessEventDetailView
      event={event}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/admin/history'))}
      onOpenAuthorization={(authorizationId) =>
        router.push({ pathname: '/admin/authorizations/[id]', params: { id: authorizationId } })
      }
    />
  );
};
