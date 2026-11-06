import { makeAuthenticate } from '../infra/http/authenticate';
import { makeAuthenticateTerminal } from '../infra/http/authenticateTerminal';
import { authenticateUser } from '../useCases/Auth/AuthenticateUser';
import { authenticateTerminalUseCase } from '../useCases/Terminals/AuthenticateTerminal';

export { authorize } from '../infra/http/authorize';
export const authenticate = makeAuthenticate(authenticateUser);
export const authenticateTerminal = makeAuthenticateTerminal(authenticateTerminalUseCase);
