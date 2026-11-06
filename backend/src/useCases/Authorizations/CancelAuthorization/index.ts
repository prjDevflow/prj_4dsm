import { container as c } from '../../../main/container';
import { CancelAuthorizationController } from './CancelAuthorization_Controller';
import { CancelAuthorizationUseCase } from './CancelAuthorization_UseCase';

const useCase = new CancelAuthorizationUseCase(c.authorizations, c.clock);
export const cancelAuthorizationController = new CancelAuthorizationController(useCase);
