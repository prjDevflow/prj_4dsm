import { container as c } from '../../../main/container';
import { CreateAuthorizationController } from './CreateAuthorization_Controller';
import { CreateAuthorizationUseCase } from './CreateAuthorization_UseCase';

const useCase = new CreateAuthorizationUseCase(c.locationUnitOfWork, c.ids, c.clock);
export const createAuthorizationController = new CreateAuthorizationController(useCase);
