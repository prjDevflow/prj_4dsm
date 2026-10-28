import { env } from '@/lib/env';
import { FakeGetHealthService } from './fakes/FakeGetHealthService';
import { GetHealthService } from './implementations/GetHealthService';

// One entry per service; the names are the ones accepted in EXPO_PUBLIC_FAKE_SERVICES.
export const createServices = (fakeServices: string[]) => {
  const useFake = (name: string) => fakeServices.includes(name);

  return {
    getHealth: useFake('getHealth') ? new FakeGetHealthService() : new GetHealthService(),
  };
};

export const services = createServices(env.fakeServices);
