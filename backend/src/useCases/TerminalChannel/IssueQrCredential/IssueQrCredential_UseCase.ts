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

const PAYLOAD_PREFIX = 'ACS1:';
/** 16 random bytes are 22 characters in base64url without padding. */
const TOKEN_BYTES = 16;

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
    const now = this.clock.now();
    const token = this.random.base64Url(TOKEN_BYTES);
    const lifeMs = (this.config.ttlSeconds + this.config.toleranceSeconds) * 1000;
    const expiraEm = new Date(now.getTime() + lifeMs);

    await this.credentials.saveIfIdle(
      {
        id: this.ids.next(),
        terminalId,
        // Only the digest is stored: the database never holds a token that could be replayed.
        tokenHash: this.hash.sha256(token),
        emitidoEm: now,
        expiraEm,
        consumidoEm: null,
        consumidoPorId: null,
      },
      new Date(now.getTime() - this.config.minIntervalSeconds * 1000),
    );

    return {
      payload: `${PAYLOAD_PREFIX}${token}`,
      emitidoEm: now.toISOString(),
      expiraEm: expiraEm.toISOString(),
      renovarEmMs: this.config.renovarEmMs,
    };
  }
}
