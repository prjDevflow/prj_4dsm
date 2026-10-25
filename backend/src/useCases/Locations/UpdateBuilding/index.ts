import { container as c } from '../../../main/container';
import { UpdateBuildingController } from './UpdateBuilding_Controller';
import { UpdateBuildingUseCase } from './UpdateBuilding_UseCase';

const useCase = new UpdateBuildingUseCase(c.buildings, c.authorizations, c.clock);
export const updateBuildingController = new UpdateBuildingController(useCase);
