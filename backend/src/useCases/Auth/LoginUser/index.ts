import { container as c } from '../../../main/container';
import { LoginUserController } from './LoginUser_Controller';
import { LoginUserUseCase } from './LoginUser_UseCase';

const useCase = new LoginUserUseCase(c.users, c.hash, c.tokens, {
  expiresInSeconds: c.env.JWT_EXPIRES_IN,
});
export const loginUserController = new LoginUserController(useCase);
