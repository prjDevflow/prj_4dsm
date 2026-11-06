import { container as c } from '../../../main/container';
import { GetAuthorizationController } from './GetAuthorization_Controller';
import { GetAuthorizationUseCase } from './GetAuthorization_UseCase';

const useCase = new GetAuthorizationUseCase(c.authorizations, c.clock);
export const getAuthorizationController = new GetAuthorizationController(useCase);
