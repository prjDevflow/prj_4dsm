import type { IClock } from '../../../providers/IClock';
import type { IQrCredentialRepository } from '../../../repositories/IQrCredentialRepository';

export interface PurgeExpiredCredentialsConfig {
  /** `QR_PURGE_AFTER_HOURS`. */
  purgeAfterHours: number;
}

export class PurgeExpiredCredentialsUseCase {
  constructor(
    private credentials: IQrCredentialRepository,
    private clock: IClock,
    private config: PurgeExpiredCredentialsConfig,
  ) {}

  /** Returns how many credentials were deleted. */
  async execute(): Promise<number> {
    void this.credentials;
    void this.clock;
    void this.config;
    return 0;
  }
}
