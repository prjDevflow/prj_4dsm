import { useRouter } from 'expo-router';
import { services } from '@/service/container';
import { useMyAuthorizationsModel } from './myAuthorizations.model';
import { MyAuthorizationsView } from './myAuthorizations.view';

export const MyAuthorizationsPage = () => {
  const router = useRouter();
  const methods = useMyAuthorizationsModel({
    listMyAuthorizationsService: services.listMyAuthorizations,
  });

  return (
    <MyAuthorizationsView
      {...methods}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onOpenScanner={() => router.push('/access/scanner')}
    />
  );
};
