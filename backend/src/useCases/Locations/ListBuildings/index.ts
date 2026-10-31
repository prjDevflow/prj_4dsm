import { container as c } from '../../../main/container';
import { ListBuildingsController } from './ListBuildings_Controller';
import { ListBuildingsUseCase } from './ListBuildings_UseCase';

const useCase = new ListBuildingsUseCase(c.buildings);
export const listBuildingsController = new ListBuildingsController(useCase);
