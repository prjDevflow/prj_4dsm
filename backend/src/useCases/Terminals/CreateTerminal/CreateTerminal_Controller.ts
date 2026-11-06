import type { Request, Response } from 'express';
import { CreateTerminalSchema } from './CreateTerminal_DTO';
import type { CreateTerminalUseCase } from './CreateTerminal_UseCase';

export class CreateTerminalController {
  constructor(private useCase: CreateTerminalUseCase) {}

  async handle(req: Request, res: Response) {
    const data = CreateTerminalSchema.parse(req.body);
    return res.status(201).json(await this.useCase.execute(data));
  }
}
