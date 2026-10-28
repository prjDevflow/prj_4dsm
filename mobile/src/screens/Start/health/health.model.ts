import { useQuery } from '@tanstack/react-query';
import type { Health } from '@/lib/types/health';
import type { ApiError } from '@/service/ApiError';
import type { IGetHealthService } from '@/service/IHealthService';
import { healthErrorMessage } from './health.messages';

type HealthModelProps = {
  getHealthService: IGetHealthService;
  apiUrl: string;
};

export type HealthStatus = 'checking' | 'ok' | 'down';

const describeHealth = (health: Health) =>
  `Versão ${health.version} · banco de dados ${health.db === 'up' ? 'conectado' : 'fora do ar'}`;

export const useHealthModel = ({ getHealthService, apiUrl }: HealthModelProps) => {
  const { data, error, isPending, isFetching, refetch } = useQuery<Health, ApiError>({
    queryKey: ['health'],
    queryFn: () => getHealthService.exec(),
    // The screen exists to show the real state of the API, so it never retries on its own.
    retry: false,
  });

  const status: HealthStatus =
    isPending && isFetching ? 'checking' : data && !error ? 'ok' : 'down';

  const title = {
    checking: 'Verificando a API…',
    ok: 'API: ok',
    down: 'API: fora do ar',
  }[status];

  const detail =
    status === 'ok' && data ? describeHealth(data) : error ? healthErrorMessage(error) : null;

  const onRetry = async () => {
    await refetch();
  };

  return {
    apiUrl,
    status,
    title,
    detail,
    isRetrying: isFetching,
    onRetry,
  };
};
