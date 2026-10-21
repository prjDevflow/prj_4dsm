import { container as c } from '../../../main/container';
import { AuthenticateUserUseCase } from './AuthenticateUser_UseCase';

export const authenticateUser = new AuthenticateUserUseCase(c.users, c.tokens);
