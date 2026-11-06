import Constants from 'expo-constants';
import { useAccountModel } from './account.model';
import { AccountView } from './account.view';

export const AccountPage = () => {
  const methods = useAccountModel();
  return <AccountView {...methods} appVersion={Constants.expoConfig?.version ?? ''} />;
};
