import type { IClock } from '../../../providers/IClock';
import type { ITerminalRepository } from '../../../repositories/ITerminalRepository';
import type { IUserRepository } from '../../../repositories/IUserRepository';
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

  async execute(_terminalId: string, _input: IEnableEnrollModeDTO): Promise<EnrollModeResult> {
    void this.terminals;
    void this.users;
    void this.clock;
    void this.config;
    throw new Error('EnableEnrollMode ainda não implementado');
  }
}
