import { container as c } from '../../../main/container';
import { RotateTerminalKeyController } from './RotateTerminalKey_Controller';
import { RotateTerminalKeyUseCase } from './RotateTerminalKey_UseCase';

const useCase = new RotateTerminalKeyUseCase(c.terminals, c.hash, c.random);
export const rotateTerminalKeyController = new RotateTerminalKeyController(useCase);
