import { container as c } from '../../../main/container';
import { ListAccessEventsController } from './ListAccessEvents_Controller';
import { ListAccessEventsUseCase } from './ListAccessEvents_UseCase';

const useCase = new ListAccessEventsUseCase(c.accessEvents);
export const listAccessEventsController = new ListAccessEventsController(useCase);
