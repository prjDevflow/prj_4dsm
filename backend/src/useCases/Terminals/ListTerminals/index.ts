import { container as c } from '../../../main/container';
import { ListTerminalsController } from './ListTerminals_Controller';
import { ListTerminalsUseCase } from './ListTerminals_UseCase';

const useCase = new ListTerminalsUseCase(c.terminals, c.clock, {
  onlineWindowSeconds: c.env.TERMINAL_ONLINE_WINDOW_S,
});
export const listTerminalsController = new ListTerminalsController(useCase);
