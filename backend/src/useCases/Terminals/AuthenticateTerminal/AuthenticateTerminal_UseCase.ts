import type { IHashProvider } from '../../../providers/IHashProvider';
import type { ITerminalRepository } from '../../../repositories/ITerminalRepository';

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

  async execute(_input: AuthenticateTerminalInput): Promise<AuthenticatedTerminal> {
    throw new Error('not implemented');
  }
}
