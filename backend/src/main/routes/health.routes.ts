import { Router } from 'express';
import { adapt } from '../../infra/http/adapt';
import { getHealthController } from '../../useCases/Health/GetHealth';
import { getReadinessController } from '../../useCases/Health/GetReadiness';

export const healthRoutes = Router();

healthRoutes.get('/health', adapt(getHealthController));
healthRoutes.get('/ready', adapt(getReadinessController));
