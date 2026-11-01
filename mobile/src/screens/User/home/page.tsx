import { useUserHomeModel } from './home.model';
import { UserHomeView } from './home.view';

export const UserHomePage = () => {
  const methods = useUserHomeModel();
  return <UserHomeView {...methods} />;
};
