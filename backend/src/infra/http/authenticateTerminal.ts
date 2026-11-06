import type { RequestHandler } from 'express';
import type { AuthenticateTerminalUseCase } from '../../useCases/Terminals/AuthenticateTerminal/AuthenticateTerminal_UseCase';

/** Reads `X-Terminal-Id` and `X-Terminal-Key`; on success `req.terminal` identifies the terminal. */
export function makeAuthenticateTerminal(useCase: AuthenticateTerminalUseCase): RequestHandler {
  return async (req, _res, next) => {
    req.terminal = await useCase.execute({
      terminalId: req.header('x-terminal-id'),
      key: req.header('x-terminal-key'),
    });
    next();
  };
}
