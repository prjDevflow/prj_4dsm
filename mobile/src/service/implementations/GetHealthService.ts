import type { Health } from '@/lib/types/health';
import { AxiosInstance } from '../AxiosInstance';
import type { IGetHealthService } from '../IHealthService';

export class GetHealthService implements IGetHealthService {
  async exec(): Promise<Health> {
    const { data } = await AxiosInstance.get<Health>('/health');
    return data;
  }
}
