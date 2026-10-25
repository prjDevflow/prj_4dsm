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
    const terminal = await this.terminals.findById(terminalId);
    if (!terminal) throw new NotFoundError('Terminal não encontrado');

    const apiKey = this.random.base64Url(TERMINAL_KEY_BYTES);
    await this.terminals.save({ ...terminal, apiKeyHash: this.hash.sha256(apiKey) });
    return { id: terminal.id, apiKey };
  }
}
