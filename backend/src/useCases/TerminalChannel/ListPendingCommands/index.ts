import { container as c } from '../../../main/container';
import { ListPendingCommandsController } from './ListPendingCommands_Controller';
import { ListPendingCommandsUseCase } from './ListPendingCommands_UseCase';

const useCase = new ListPendingCommandsUseCase(c.terminalCommands, c.clock);
export const listPendingCommandsController = new ListPendingCommandsController(useCase);
