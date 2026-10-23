import { container as c } from '../../../main/container';
import { GetCurrentUserController } from './GetCurrentUser_Controller';
import { GetCurrentUserUseCase } from './GetCurrentUser_UseCase';

const useCase = new GetCurrentUserUseCase(c.users);
export const getCurrentUserController = new GetCurrentUserController(useCase);
