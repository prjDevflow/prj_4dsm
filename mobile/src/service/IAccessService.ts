import type { AccessGranted, ValidateQrBody } from '@/lib/types/access';

/** Answers the 200; a denial is a 403 with the reason in `ApiError.code`. Never retried on its own. */
export interface IValidateQrService {
  exec: (body: ValidateQrBody) => Promise<AccessGranted>;
}
