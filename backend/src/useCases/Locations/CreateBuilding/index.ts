import { container as c } from '../../../main/container';
import { CreateBuildingController } from './CreateBuilding_Controller';
import { CreateBuildingUseCase } from './CreateBuilding_UseCase';

const useCase = new CreateBuildingUseCase(c.buildings, c.ids);
export const createBuildingController = new CreateBuildingController(useCase);
