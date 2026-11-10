import { container as c } from '../../../main/container';
import { ListMyAccessEventsController } from './ListMyAccessEvents_Controller';
import { ListMyAccessEventsUseCase } from './ListMyAccessEvents_UseCase';

const useCase = new ListMyAccessEventsUseCase(c.accessEvents);
export const listMyAccessEventsController = new ListMyAccessEventsController(useCase);
