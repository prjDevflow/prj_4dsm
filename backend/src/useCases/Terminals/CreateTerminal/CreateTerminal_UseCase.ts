import type { IHashProvider } from '../../../providers/IHashProvider';
import type { IIdGenerator } from '../../../providers/IIdGenerator';
import type { ISecureRandom } from '../../../providers/ISecureRandom';
import type { IAccessPointRepository } from '../../../repositories/IAccessPointRepository';
import type { ITerminalRepository } from '../../../repositories/ITerminalRepository';
import type { ICreateTerminalDTO } from './CreateTerminal_DTO';

export interface CreatedTerminal {
  id: string;
  /** Shown once: the database keeps only its SHA-256. */
  apiKey: string;
}

export class CreateTerminalUseCase {
  constructor(
    private terminals: ITerminalRepository,
    private accessPoints: IAccessPointRepository,
    private hash: IHashProvider,
    private random: ISecureRandom,
    private ids: IIdGenerator,
  ) {}

  async execute(_input: ICreateTerminalDTO): Promise<CreatedTerminal> {
    throw new Error('not implemented');
  }
}
