import { container as c } from '../../../main/container';
import { ListMyAuthorizationsController } from './ListMyAuthorizations_Controller';
import { ListMyAuthorizationsUseCase } from './ListMyAuthorizations_UseCase';

const useCase = new ListMyAuthorizationsUseCase(c.authorizations, c.clock);
export const listMyAuthorizationsController = new ListMyAuthorizationsController(useCase);
