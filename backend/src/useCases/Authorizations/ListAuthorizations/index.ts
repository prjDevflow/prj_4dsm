import { container as c } from '../../../main/container';
import { ListAuthorizationsController } from './ListAuthorizations_Controller';
import { ListAuthorizationsUseCase } from './ListAuthorizations_UseCase';

const useCase = new ListAuthorizationsUseCase(c.authorizations, c.clock);
export const listAuthorizationsController = new ListAuthorizationsController(useCase);
