import type { IClock } from '../../../providers/IClock';
import type { ITerminalRepository } from '../../../repositories/ITerminalRepository';
import type { IUserRepository } from '../../../repositories/IUserRepository';
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

  async execute(_terminalId: string, _input: IEnableEnrollModeDTO): Promise<EnrollModeView> {
    throw new Error('não implementado');
  }
}
