import { env } from '@/lib/env';
import { FakeGetHealthService } from './fakes/FakeGetHealthService';
import { FakeGetMeService } from './fakes/FakeGetMeService';
import { FakeLoginUserService } from './fakes/FakeLoginUserService';
import { GetHealthService } from './implementations/GetHealthService';
import { GetMeService } from './implementations/GetMeService';
import { LoginUserService } from './implementations/LoginUserService';

// One entry per service; the names are the ones accepted in EXPO_PUBLIC_FAKE_SERVICES.
export const createServices = (fakeServices: string[]) => {
  const isFake = (name: string) => fakeServices.includes(name);

  return {
    getHealth: isFake('getHealth') ? new FakeGetHealthService() : new GetHealthService(),
    loginUser: isFake('loginUser') ? new FakeLoginUserService() : new LoginUserService(),
    getMe: isFake('getMe') ? new FakeGetMeService() : new GetMeService(),
  };
};

export const services = createServices(env.fakeServices);
