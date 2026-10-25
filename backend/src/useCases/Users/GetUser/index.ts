import { container as c } from '../../../main/container';
import { GetUserController } from './GetUser_Controller';
import { GetUserUseCase } from './GetUser_UseCase';

const useCase = new GetUserUseCase(c.users);
export const getUserController = new GetUserController(useCase);
