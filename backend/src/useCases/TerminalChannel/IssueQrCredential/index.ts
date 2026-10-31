import { container as c } from '../../../main/container';
import { IssueQrCredentialController } from './IssueQrCredential_Controller';
import { IssueQrCredentialUseCase } from './IssueQrCredential_UseCase';

const useCase = new IssueQrCredentialUseCase(c.qrCredentials, c.random, c.hash, c.ids, c.clock, {
  ttlSeconds: c.env.QR_TTL_SECONDS,
  toleranceSeconds: c.env.QR_TOLERANCE_SECONDS,
  minIntervalSeconds: c.env.QR_ISSUE_MIN_INTERVAL_S,
  renovarEmMs: c.env.QR_REFRESH_MS,
});
export const issueQrCredentialUseCase = useCase;
export const issueQrCredentialController = new IssueQrCredentialController(useCase);
