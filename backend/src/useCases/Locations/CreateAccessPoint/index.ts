import { container as c } from '../../../main/container';
import { CreateAccessPointController } from './CreateAccessPoint_Controller';
import { CreateAccessPointUseCase } from './CreateAccessPoint_UseCase';

const useCase = new CreateAccessPointUseCase(c.locationUnitOfWork, c.ids);
export const createAccessPointController = new CreateAccessPointController(useCase);
