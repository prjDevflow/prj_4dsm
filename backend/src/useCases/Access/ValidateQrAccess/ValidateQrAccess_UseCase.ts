import { AccessEvent } from '../../../entities/AccessEvent';
import type { QrDenialReason } from '../../../entities/DenialReason';
import { AccessEvaluator } from '../../../entities/rules/AccessEvaluator';
import { haversineDistanceM, type GeoPoint } from '../../../entities/rules/haversineDistanceM';
import {
  resolveReferencePosition,
  type PositionSource,
} from '../../../entities/rules/resolveReferencePosition';
import { TerminalCommand } from '../../../entities/TerminalCommand';
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
import { UnauthorizedError } from '../../../shared/errors/AppError';
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

const PAYLOAD_PREFIX = 'ACS1:';

/** The phone's position, or null when it is missing or cannot exist on Earth. */
function readPosition(input: ValidateQrAccessInput): GeoPoint | null {
  const { latitude, longitude } = input;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

/** What is known about the attempt when it is denied; it grows as the checks go on. */
interface Attempt {
  userId: string;
  precisaoMetros: number | null;
  terminalId?: string;
  accessPointId?: string;
  authorizationId?: string;
  distanciaM?: number;
  /** SHA-256 of an unknown credential; the event keeps only a short prefix. */
  credencialHash?: string;
}

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

  async execute(input: ValidateQrAccessInput): Promise<QrAccessDecision> {
    const now = this.clock.now();
    const token = input.payload.slice(PAYLOAD_PREFIX.length);
    const tokenHash = this.hash.sha256(token);
    // The token was valid a moment ago; an account erased since then ends the session (no event: no one to blame).
    const user = await this.users.findById(input.userId);
    if (!user) throw new UnauthorizedError();
    const attempt: Attempt = {
      userId: user.id,
      precisaoMetros: input.precisaoMetros ?? null,
    };

    // 1. The token exists. Nothing else is known about an unknown credential, not even the terminal.
    const credential = await this.credentials.findByTokenHash(tokenHash);
    if (!credential)
      return this.deny('CREDENCIAL_INVALIDA', { ...attempt, credencialHash: tokenHash }, now);

    const terminal = await this.terminals.findById(credential.terminalId);
    const accessPoint = terminal ? await this.accessPoints.findById(terminal.accessPointId) : null;
    // The foreign keys make these two certain; if not, the credential is as good as unknown.
    if (!terminal || !accessPoint) return this.deny('CREDENCIAL_INVALIDA', attempt, now);
    const located: Attempt = {
      ...attempt,
      terminalId: terminal.id,
      accessPointId: accessPoint.id,
    };

    // 2 and 3. Used before, or past its end. The end itself still counts.
    if (credential.consumidoEm !== null) return this.deny('CREDENCIAL_REUTILIZADA', located, now);
    if (now.getTime() > credential.expiraEm.getTime()) {
      return this.deny('CREDENCIAL_EXPIRADA', located, now);
    }

    // 4. A deactivated terminal or point no longer honors credentials it issued before.
    if (!terminal.ativo || !accessPoint.ativo)
      return this.deny('CREDENCIAL_INVALIDA', located, now);

    // 5. An inactive account is denied even though its token still works (so the attempt is recorded).
    if (!user.ativo) return this.deny('USUARIO_INATIVO', located, now);

    // 6 to 9. Which authorization, if any, lets this user through here and now.
    const authorizations = await this.authorizations.findByUserAndAccessPoint(
      user.id,
      accessPoint.id,
    );
    const evaluation = AccessEvaluator.evaluate({
      user,
      accessPointId: accessPoint.id,
      authorizations,
      now,
    });
    if (!evaluation.granted) return this.deny(evaluation.reason, located, now);
    const { authorization } = evaluation;

    // From here on the authorization is known, and the events of the denials below carry it.
    const withAuthorization: Attempt = { ...located, authorizationId: authorization.id };

    // 10. The phone must say where it is. A position out of range is as good as none.
    const phone = readPosition(input);
    if (!phone) return this.deny('LOCALIZACAO_INVALIDA', withAuthorization, now);

    // 11. Not farther than the limit from where the terminal is (null: `GPS` mode without a usable GPS).
    const reference = resolveReferencePosition(terminal, accessPoint, now, {
      source: this.config.positionSource,
      gpsMaxAgeMinutes: this.config.gpsMaxAgeMinutes,
    });
    if (!reference) return this.deny('LOCALIZACAO_INVALIDA', withAuthorization, now);
    const distanceM = haversineDistanceM(phone, reference);
    if (distanceM > this.config.maxDistanceM) {
      return this.deny(
        'DISTANTE_DO_TERMINAL',
        { ...withAuthorization, distanciaM: distanceM },
        now,
      );
    }

    const result = await this.accessGrants.commitApproval({
      credentialId: credential.id,
      userId: user.id,
      authorizationId: authorization.id,
      now,
      event: AccessEvent.approved({
        id: this.ids.next(),
        ocorridoEm: now,
        metodo: 'QR',
        terminalId: terminal.id,
        accessPointId: accessPoint.id,
        usuarioId: user.id,
        authorizationId: authorization.id,
        distanciaM: distanceM,
        precisaoMetros: attempt.precisaoMetros,
      }),
      command: TerminalCommand.open({
        terminalId: terminal.id,
        now,
        ttlSeconds: this.config.commandTtlSeconds,
        aberturaMs: this.config.aberturaMs,
      }),
    });
    // Someone else won the race between the checks above and the commit: a denial like any other,
    // and the credential is still unused (the commit left nothing behind).
    if (!result.ok) return this.deny(result.reason, located, now);

    return {
      granted: true,
      authorizationId: authorization.id,
      usosRestantes: result.usosRestantes,
      distanceM,
      local: { nome: accessPoint.nome },
      ocorridoEm: now,
    };
  }

  /**
   * Records the denial and tells the terminal, when it is known. `recordDenied` never throws, and a
   * command that cannot be stored must not hide the denial from the person either: it is logged.
   */
  private async deny(
    reason: QrDenialReason,
    attempt: Attempt,
    now: Date,
  ): Promise<QrAccessDecision> {
    await this.recorder.recordDenied({
      metodo: 'QR',
      motivo: reason,
      usuarioId: attempt.userId,
      terminalId: attempt.terminalId ?? null,
      accessPointId: attempt.accessPointId ?? null,
      authorizationId: attempt.authorizationId ?? null,
      distanciaM: attempt.distanciaM ?? null,
      precisaoMetros: attempt.precisaoMetros,
      credencialHash: attempt.credencialHash ?? null,
    });
    if (attempt.terminalId) {
      try {
        await this.commands.create(
          TerminalCommand.deny({
            terminalId: attempt.terminalId,
            motivo: reason,
            now,
            ttlSeconds: this.config.commandTtlSeconds,
          }),
        );
      } catch (error) {
        this.logger.error('Falha ao criar o comando NEGAR do terminal', {
          motivo: reason,
          terminalId: attempt.terminalId,
          erro: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return { granted: false, reason };
  }
}
