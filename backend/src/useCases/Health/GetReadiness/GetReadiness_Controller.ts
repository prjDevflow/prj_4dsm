import type { Request, Response } from 'express';
import type { GetReadinessUseCase } from './GetReadiness_UseCase';

export class GetReadinessController {
  constructor(private useCase: GetReadinessUseCase) {}

  async handle(_req: Request, res: Response) {
    const result = await this.useCase.execute();
    // 503 is the signal a monitor or load balancer reads; the body only helps a person.
    return res.status(result.status === 'ready' ? 200 : 503).json(result);
  }
}
