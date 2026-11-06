import { container as c } from '../../../main/container';
import { ListUsersController } from './ListUsers_Controller';
import { ListUsersUseCase } from './ListUsers_UseCase';

const useCase = new ListUsersUseCase(c.users);
export const listUsersController = new ListUsersController(useCase);
