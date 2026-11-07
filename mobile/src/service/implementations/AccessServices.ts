import type { AccessGranted, ValidateQrBody } from '@/lib/types/access';
import { AxiosInstance } from '../AxiosInstance';
import type { IValidateQrService } from '../IAccessService';

const VALIDATE_TIMEOUT_MS = 10_000;

export class ValidateQrService implements IValidateQrService {
  async exec(body: ValidateQrBody): Promise<AccessGranted> {
    const { data } = await AxiosInstance.post<AccessGranted>('/access/qr/validate', body, {
      timeout: VALIDATE_TIMEOUT_MS,
    });
    return data;
  }
}
