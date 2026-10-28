import { env } from '@/lib/env';
import { services } from '@/service/container';
import { useHealthModel } from './health.model';
import { HealthView } from './health.view';

export const HealthPage = () => {
  const methods = useHealthModel({
    getHealthService: services.getHealth,
    apiUrl: env.apiUrl,
    showCatalog: __DEV__,
  });
  return <HealthView {...methods} />;
};
