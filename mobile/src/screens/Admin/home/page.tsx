import { useAdminHomeModel } from './home.model';
import { AdminHomeView } from './home.view';

export const AdminHomePage = () => {
  const methods = useAdminHomeModel();
  return <AdminHomeView {...methods} />;
};
