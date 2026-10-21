import { container as c } from '../../../main/container';
import { CreateUserController } from './CreateUser_Controller';
import { CreateUserUseCase } from './CreateUser_UseCase';

const useCase = new CreateUserUseCase(c.users, c.hash, c.ids, c.clock);
export const createUserController = new CreateUserController(useCase);
