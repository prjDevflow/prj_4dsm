import { container as c } from '../../../main/container';
import { ListAccessPointsController } from './ListAccessPoints_Controller';
import { ListAccessPointsUseCase } from './ListAccessPoints_UseCase';

const useCase = new ListAccessPointsUseCase(c.accessPoints);
export const listAccessPointsController = new ListAccessPointsController(useCase);
