import { Router } from 'express';
import { adapt } from '../../infra/http/adapt';
import { getHealthController } from '../../useCases/Health/GetHealth';

export const healthRoutes = Router();

healthRoutes.get('/health', adapt(getHealthController));
