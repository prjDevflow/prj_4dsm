import { container as c } from '../../../main/container';
import { GetTerminalController } from './GetTerminal_Controller';
import { GetTerminalUseCase } from './GetTerminal_UseCase';

const useCase = new GetTerminalUseCase(c.terminals, c.clock, {
  onlineWindowSeconds: c.env.TERMINAL_ONLINE_WINDOW_S,
});
export const getTerminalController = new GetTerminalController(useCase);
