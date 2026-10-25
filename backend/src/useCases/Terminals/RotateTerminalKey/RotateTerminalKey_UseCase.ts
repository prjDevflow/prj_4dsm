import type { IHashProvider } from '../../../providers/IHashProvider';
import type { ISecureRandom } from '../../../providers/ISecureRandom';
import type { ITerminalRepository } from '../../../repositories/ITerminalRepository';
import type { CreatedTerminal } from '../CreateTerminal/CreateTerminal_UseCase';

export class RotateTerminalKeyUseCase {
  constructor(
    private terminals: ITerminalRepository,
    private hash: IHashProvider,
    private random: ISecureRandom,
  ) {}

  async execute(_terminalId: string): Promise<CreatedTerminal> {
    throw new Error('not implemented');
  }
}
