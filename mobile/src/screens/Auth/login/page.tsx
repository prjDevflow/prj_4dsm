import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { services } from '@/service/container';
import { useLoginModel } from './login.model';
import { LoginView } from './login.view';

export const LoginPage = () => {
  const router = useRouter();
  const methods = useLoginModel({ loginUserService: services.loginUser });

  return (
    <LoginView
      {...methods}
      appVersion={Constants.expoConfig?.version ?? ''}
      showDevTools={__DEV__}
      onOpenDevTools={() => router.push('/health')}
    />
  );
};
