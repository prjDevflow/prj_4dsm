import type { Request, Response } from 'express';

// Returns the promise so Express 5 forwards rejections to the error handler.
export const adapt =
  (controller: { handle(req: Request, res: Response): Promise<unknown> }) =>
  (req: Request, res: Response) =>
    controller.handle(req, res);
