import type { QrDenialReason } from '../../../entities/DenialReason';
import type { PositionSource } from '../../../entities/rules/resolveReferencePosition';
import type { IClock } from '../../../providers/IClock';
import type { IHashProvider } from '../../../providers/IHashProvider';
import type { IIdGenerator } from '../../../providers/IIdGenerator';
import type { ILogger } from '../../../providers/ILogger';
import type { IAccessGrantRepository } from '../../../repositories/IAccessGrantRepository';
import type { IAccessPointRepository } from '../../../repositories/IAccessPointRepository';
import type { IAuthorizationRepository } from '../../../repositories/IAuthorizationRepository';
import type { IQrCredentialRepository } from '../../../repositories/IQrCredentialRepository';
import type { ITerminalCommandRepository } from '../../../repositories/ITerminalCommandRepository';
import type { ITerminalRepository } from '../../../repositories/ITerminalRepository';
import type { IUserRepository } from '../../../repositories/IUserRepository';
import type { AccessEventRecorder } from '../../Events/AccessEventRecorder';

export interface ValidateQrAccessInput {
  /** From the token of the app. */
  userId: string;
  /** `ACS1:<token>`, already checked against the pattern at the edge. */
  payload: string;
  /** Absent or null when the phone could not locate itself. */
  latitude?: number | null;
  longitude?: number | null;
  /** GPS accuracy reported by the phone, in meters. */
  precisaoMetros?: number | null;
}

export interface ValidateQrAccessConfig {
  /** `MAX_DISTANCE_M`. */
  maxDistanceM: number;
  /** `TERMINAL_POSITION_SOURCE`. */
  positionSource: PositionSource;
  /** `GPS_MAX_AGE_MIN`. */
  gpsMaxAgeMinutes: number;
  /** `COMMAND_TTL_SECONDS`. */
  commandTtlSeconds: number;
  /** `OPEN_DURATION_MS`. */
  aberturaMs: number;
}

/** A denial is a value, not an exception: the controller turns it into the 403. */
export type QrAccessDecision =
  | {
      granted: true;
      authorizationId: string;
      usosRestantes: number;
      /** Exact distance in meters between the phone and the terminal. */
      distanceM: number;
      local: { nome: string };
      ocorridoEm: Date;
    }
  | { granted: false; reason: QrDenialReason };

export class ValidateQrAccessUseCase {
  constructor(
    private credentials: IQrCredentialRepository,
    private terminals: ITerminalRepository,
    private accessPoints: IAccessPointRepository,
    private users: IUserRepository,
    private authorizations: IAuthorizationRepository,
    private accessGrants: IAccessGrantRepository,
    private commands: ITerminalCommandRepository,
    private recorder: AccessEventRecorder,
    private hash: IHashProvider,
    private ids: IIdGenerator,
    private clock: IClock,
    private logger: ILogger,
    private config: ValidateQrAccessConfig,
  ) {}

  async execute(_input: ValidateQrAccessInput): Promise<QrAccessDecision> {
    void this.credentials;
    void this.terminals;
    void this.accessPoints;
    void this.users;
    void this.authorizations;
    void this.accessGrants;
    void this.commands;
    void this.recorder;
    void this.hash;
    void this.ids;
    void this.clock;
    void this.logger;
    void this.config;
    throw new Error('não implementado');
  }
}
