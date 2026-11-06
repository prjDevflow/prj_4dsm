import type { IHashProvider } from '../../../providers/IHashProvider';
import type { ISecureRandom } from '../../../providers/ISecureRandom';
import type { ITerminalRepository } from '../../../repositories/ITerminalRepository';
import { NotFoundError } from '../../../shared/errors/AppError';
import { TERMINAL_KEY_BYTES, type CreatedTerminal } from '../CreateTerminal/CreateTerminal_UseCase';

export class RotateTerminalKeyUseCase {
  constructor(
    private terminals: ITerminalRepository,
    private hash: IHashProvider,
    private random: ISecureRandom,
  ) {}

  async execute(terminalId: string): Promise<CreatedTerminal> {
    const apiKey = this.random.base64Url(TERMINAL_KEY_BYTES);
    // Only the hash is written, so a rename or deactivation stored meanwhile is never undone.
    const found = await this.terminals.replaceKeyHash(terminalId, this.hash.sha256(apiKey));
    if (!found) throw new NotFoundError('Terminal não encontrado');
    return { id: terminalId, apiKey };
  }
}
