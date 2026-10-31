import { container as c } from '../../../main/container';
import { UpdateTerminalController } from './UpdateTerminal_Controller';
import { UpdateTerminalUseCase } from './UpdateTerminal_UseCase';

const useCase = new UpdateTerminalUseCase(c.terminals, c.clock, {
  onlineWindowSeconds: c.env.TERMINAL_ONLINE_WINDOW_S,
});
export const updateTerminalController = new UpdateTerminalController(useCase);
