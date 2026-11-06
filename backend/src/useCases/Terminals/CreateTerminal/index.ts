import { container as c } from '../../../main/container';
import { CreateTerminalController } from './CreateTerminal_Controller';
import { CreateTerminalUseCase } from './CreateTerminal_UseCase';

const useCase = new CreateTerminalUseCase(c.terminals, c.accessPoints, c.hash, c.random, c.ids);
export const createTerminalController = new CreateTerminalController(useCase);
