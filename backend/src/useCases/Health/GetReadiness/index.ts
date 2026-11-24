import { container } from '../../../main/container';
import { GetReadinessController } from './GetReadiness_Controller';
import { GetReadinessUseCase } from './GetReadiness_UseCase';

const useCase = new GetReadinessUseCase(container.clock, container.databaseProbe);
export const getReadinessController = new GetReadinessController(useCase);
