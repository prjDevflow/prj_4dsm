import { container as c } from '../../../main/container';
import { AuthenticateTerminalUseCase } from './AuthenticateTerminal_UseCase';

export const authenticateTerminalUseCase = new AuthenticateTerminalUseCase(c.terminals, c.hash);
