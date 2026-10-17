import { container as c } from '../../../main/container';
import { GetHealthController } from './GetHealth_Controller';
import { GetHealthUseCase } from './GetHealth_UseCase';

const useCase = new GetHealthUseCase(c.clock, { version: c.appVersion });
export const getHealthController = new GetHealthController(useCase);
