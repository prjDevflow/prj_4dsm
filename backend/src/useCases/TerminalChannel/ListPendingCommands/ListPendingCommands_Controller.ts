import type { Request, Response } from 'express';
import type { TerminalCommand } from '../../../entities/TerminalCommand';
import { UnauthorizedError } from '../../../shared/errors/AppError';
import { ListPendingCommandsSchema } from './ListPendingCommands_DTO';
import type { ListPendingCommandsUseCase } from './ListPendingCommands_UseCase';

/** Contract format (doc 03, section 4.5): `ABRIR` carries `aberturaMs`, `NEGAR` carries `motivo`. */
const toCommandResponse = (command: TerminalCommand) => ({
  id: command.id,
  tipo: command.tipo,
  ...(command.tipo === 'ABRIR' ? { aberturaMs: command.aberturaMs } : { motivo: command.motivo }),
  criadoEm: command.criadoEm.toISOString(),
});

export class ListPendingCommandsController {
  constructor(private useCase: ListPendingCommandsUseCase) {}

  async handle(req: Request, res: Response) {
    // `authenticateTerminal` runs first; this only guards against a route mounted without it.
    if (!req.terminal) throw new UnauthorizedError('Credenciais do terminal inválidas');
    const query = ListPendingCommandsSchema.parse(req.query);
    const commands = await this.useCase.execute(req.terminal.terminalId, query);
    return res.status(200).json({ commands: commands.map(toCommandResponse) });
  }
}
