import { services } from '@/service/container';
import { useUserHomeModel } from './home.model';
import { UserHomeView } from './home.view';

export const UserHomePage = () => {
  const methods = useUserHomeModel({
    listMyAuthorizationsService: services.listMyAuthorizations,
  });
  return <UserHomeView {...methods} />;
};
