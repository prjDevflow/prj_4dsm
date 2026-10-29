import { Redirect } from 'expo-router';
import { env } from '@/lib/env';
import { services } from '@/service/container';
import { useHealthModel } from './health.model';
import { HealthView } from './health.view';

const HealthScreen = () => {
  const methods = useHealthModel({
    getHealthService: services.getHealth,
    apiUrl: env.apiUrl,
    showCatalog: true,
  });
  return <HealthView {...methods} />;
};

/** Development tool (opened from the login); release builds go back to the start. */
export const HealthPage = () => (__DEV__ ? <HealthScreen /> : <Redirect href="/" />);
