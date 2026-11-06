import { useProvisionalHomeModel } from './home.model';
import { ProvisionalHomeView } from './home.view';

export const ProvisionalHomePage = () => {
  const methods = useProvisionalHomeModel();
  return <ProvisionalHomeView {...methods} />;
};
