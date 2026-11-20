import { container as c } from '../../../main/container';
import { AckCommandController } from './AckCommand_Controller';
import { AckCommandUseCase } from './AckCommand_UseCase';

const useCase = new AckCommandUseCase(c.terminalCommands, c.clock);
export const ackCommandController = new AckCommandController(useCase);
