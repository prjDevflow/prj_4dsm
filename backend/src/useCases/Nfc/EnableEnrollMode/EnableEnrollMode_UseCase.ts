import type { IClock } from '../../../providers/IClock';
import type { ITerminalRepository } from '../../../repositories/ITerminalRepository';
import type { IUserRepository } from '../../../repositories/IUserRepository';
import { NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import type { IEnableEnrollModeDTO } from './EnableEnrollMode_DTO';

export interface EnrollModeConfig {
  /** `ENROLL_MODE_SECONDS`. */
  enrollModeSeconds: number;
}

export interface EnrollModeResult {
  terminalId: string;
  usuarioId: string;
  /** The last instant the mode still counts. */
  expiraEm: Date;
}

export class EnableEnrollModeUseCase {
  constructor(
    private terminals: ITerminalRepository,
    private users: IUserRepository,
    private clock: IClock,
    private config: EnrollModeConfig,
  ) {}

  async execute(terminalId: string, input: IEnableEnrollModeDTO): Promise<EnrollModeResult> {
    // The terminal is the resource in the path, so it is looked at first. An inactive one is accepted:
    // it cannot read a tag anyway (the NFC route refuses it), so the mode would simply run out.
    const terminal = await this.terminals.findById(terminalId);
    if (!terminal) throw new NotFoundError('Terminal não encontrado');

    const user = await this.users.findById(input.usuarioId);
    if (!user) throw new NotFoundError('Usuário não encontrado');
    if (!user.ativo) {
      throw new ValidationError('Dados inválidos', [
        { field: 'usuarioId', message: 'Usuário inativo' },
      ]);
    }

    const expiraEm = new Date(this.clock.now().getTime() + this.config.enrollModeSeconds * 1000);
    // Only the two enroll columns are written; false means the terminal vanished after the read above.
    const stored = await this.terminals.updateEnrollMode(terminal.id, user.id, expiraEm);
    if (!stored) throw new NotFoundError('Terminal não encontrado');
    return { terminalId: terminal.id, usuarioId: user.id, expiraEm };
  }
}
