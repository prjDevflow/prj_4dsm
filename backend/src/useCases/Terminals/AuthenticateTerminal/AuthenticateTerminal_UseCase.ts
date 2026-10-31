import type { IHashProvider } from '../../../providers/IHashProvider';
import type { ITerminalRepository } from '../../../repositories/ITerminalRepository';
import { ForbiddenError, UnauthorizedError } from '../../../shared/errors/AppError';
import { isValidId } from '../../../shared/idParam';

export interface AuthenticateTerminalInput {
  /** `X-Terminal-Id` as received. */
  terminalId: string | undefined;
  /** `X-Terminal-Key` as received. */
  key: string | undefined;
}

export interface AuthenticatedTerminal {
  terminalId: string;
  accessPointId: string;
}

export class AuthenticateTerminalUseCase {
  constructor(
    private terminals: ITerminalRepository,
    private hash: IHashProvider,
  ) {}

  async execute({ terminalId, key }: AuthenticateTerminalInput): Promise<AuthenticatedTerminal> {
    // One answer for "no such terminal" and "wrong key": the caller learns nothing about which ids exist.
    const invalid = () => new UnauthorizedError('Credenciais do terminal inválidas');
    if (!key || !isValidId(terminalId)) throw invalid();

    const terminal = await this.terminals.findById(terminalId);
    if (!terminal || !this.hash.sha256Matches(key, terminal.apiKeyHash)) throw invalid();

    // Checked only after the key, so an inactive terminal is not revealed to someone without its key.
    if (!terminal.ativo) throw new ForbiddenError('Terminal inativo');

    return { terminalId: terminal.id, accessPointId: terminal.accessPointId };
  }
}
