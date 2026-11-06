import { container as c } from '../../../main/container';
import { UpdateUserController } from './UpdateUser_Controller';
import { UpdateUserUseCase } from './UpdateUser_UseCase';

const useCase = new UpdateUserUseCase(c.users, c.hash, c.clock);
export const updateUserController = new UpdateUserController(useCase);
