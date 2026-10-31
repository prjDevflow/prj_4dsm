import { container as c } from '../../../main/container';
import { UpdateAccessPointController } from './UpdateAccessPoint_Controller';
import { UpdateAccessPointUseCase } from './UpdateAccessPoint_UseCase';

const useCase = new UpdateAccessPointUseCase(c.locationUnitOfWork, c.clock);
export const updateAccessPointController = new UpdateAccessPointController(useCase);
