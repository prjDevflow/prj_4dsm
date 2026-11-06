import type { IClock } from '../../../providers/IClock';
import type { ITerminalRepository } from '../../../repositories/ITerminalRepository';
import type { IUserRepository } from '../../../repositories/IUserRepository';
import { NotFoundError, ValidationError, type ErrorDetails } from '../../../shared/errors/AppError';
import type { IEnableEnrollModeDTO } from './EnableEnrollMode_DTO';

export interface EnableEnrollModeConfig {
  /** `ENROLL_MODE_SECONDS`. */
  enrollModeSeconds: number;
}

export interface EnrollModeView {
  terminalId: string;
  usuarioId: string;
  modoCadastroAte: Date;
}

export class EnableEnrollModeUseCase {
  constructor(
    private terminals: ITerminalRepository,
    private users: IUserRepository,
    private clock: IClock,
    private config: EnableEnrollModeConfig,
  ) {}

  async execute(terminalId: string, input: IEnableEnrollModeDTO): Promise<EnrollModeView> {
    const terminal = await this.terminals.findById(terminalId);
    if (!terminal) throw new NotFoundError('Terminal não encontrado');
    const user = await this.users.findById(input.usuarioId);
    if (!user) throw new NotFoundError('Usuário não encontrado');

    const problems: ErrorDetails = [];
    // An inactive terminal cannot authenticate, so the mode would run out without ever being used.
    if (!terminal.ativo) problems.push({ field: 'id', message: 'Terminal inativo' });
    if (!user.ativo) problems.push({ field: 'usuarioId', message: 'Usuário inativo' });
    if (problems.length > 0) throw new ValidationError('Dados inválidos', problems);

    const ate = new Date(this.clock.now().getTime() + this.config.enrollModeSeconds * 1000);
    await this.terminals.setEnrollMode(terminal.id, { usuarioId: user.id, ate });
    return { terminalId: terminal.id, usuarioId: user.id, modoCadastroAte: ate };
  }
}
