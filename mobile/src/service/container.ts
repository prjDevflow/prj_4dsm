import { env } from '@/lib/env';
import { FakeGetHealthService } from './fakes/FakeGetHealthService';
import { FakeGetMeService } from './fakes/FakeGetMeService';
import { FakeLoginUserService } from './fakes/FakeLoginUserService';
import {
  FakeCreateUserService,
  FakeGetUserService,
  FakeListUsersService,
  FakeUpdateUserService,
} from './fakes/FakeUserServices';
import { CreateUserService } from './implementations/CreateUserService';
import { GetHealthService } from './implementations/GetHealthService';
import { GetMeService } from './implementations/GetMeService';
import { GetUserService } from './implementations/GetUserService';
import { ListUsersService } from './implementations/ListUsersService';
import { LoginUserService } from './implementations/LoginUserService';
import { UpdateUserService } from './implementations/UpdateUserService';

// One entry per service; the names are the ones accepted in EXPO_PUBLIC_FAKE_SERVICES.
// "users" switches the four /users services together, since the fakes share one directory.
export const createServices = (fakeServices: string[]) => {
  const isFake = (name: string) => fakeServices.includes(name);
  const fakeUsers = isFake('users');

  return {
    getHealth: isFake('getHealth') ? new FakeGetHealthService() : new GetHealthService(),
    loginUser: isFake('loginUser') ? new FakeLoginUserService() : new LoginUserService(),
    getMe: isFake('getMe') ? new FakeGetMeService() : new GetMeService(),
    listUsers: fakeUsers ? new FakeListUsersService() : new ListUsersService(),
    getUser: fakeUsers ? new FakeGetUserService() : new GetUserService(),
    createUser: fakeUsers ? new FakeCreateUserService() : new CreateUserService(),
    updateUser: fakeUsers ? new FakeUpdateUserService() : new UpdateUserService(),
  };
};

export const services = createServices(env.fakeServices);
