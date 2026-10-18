import { container } from '../../../main/container';
import { GetHealthController } from './GetHealth_Controller';
import { GetHealthUseCase } from './GetHealth_UseCase';

const useCase = new GetHealthUseCase(container.clock, container.databaseProbe, {
  version: container.appVersion,
});
export const getHealthController = new GetHealthController(useCase);
