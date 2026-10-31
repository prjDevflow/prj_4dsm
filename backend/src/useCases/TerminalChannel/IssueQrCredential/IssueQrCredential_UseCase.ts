import type { IClock } from '../../../providers/IClock';
import type { IHashProvider } from '../../../providers/IHashProvider';
import type { IIdGenerator } from '../../../providers/IIdGenerator';
import type { ISecureRandom } from '../../../providers/ISecureRandom';
import type { IQrCredentialRepository } from '../../../repositories/IQrCredentialRepository';

export interface IssueQrCredentialConfig {
  /** `QR_TTL_SECONDS`. */
  ttlSeconds: number;
  /** `QR_TOLERANCE_SECONDS`. */
  toleranceSeconds: number;
  /** `QR_ISSUE_MIN_INTERVAL_S`. */
  minIntervalSeconds: number;
  /** `QR_REFRESH_MS`. */
  renovarEmMs: number;
}

export interface IssueQrCredentialResult {
  payload: string;
  emitidoEm: string;
  expiraEm: string;
  renovarEmMs: number;
}

export class IssueQrCredentialUseCase {
  constructor(
    private credentials: IQrCredentialRepository,
    private random: ISecureRandom,
    private hash: IHashProvider,
    private ids: IIdGenerator,
    private clock: IClock,
    private config: IssueQrCredentialConfig,
  ) {}

  async execute(terminalId: string): Promise<IssueQrCredentialResult> {
    throw new Error(`não implementado: ${terminalId}`);
  }
}
