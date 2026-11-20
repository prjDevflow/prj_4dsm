import { useLocalSearchParams, useRouter } from 'expo-router';
import { services } from '@/service/container';
import { useAuthorizationDetailModel } from './authorizationDetail.model';
import { AuthorizationDetailView } from './authorizationDetail.view';

/** "/admin/authorizations/<id>": T25 and the cancellation. */
export const AuthorizationDetailPage = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const methods = useAuthorizationDetailModel({
    authorizationId: id ?? '',
    getAuthorizationService: services.getAuthorization,
    cancelAuthorizationService: services.cancelAuthorization,
  });

  return (
    <AuthorizationDetailView
      {...methods}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/admin/authorizations'))}
    />
  );
};
