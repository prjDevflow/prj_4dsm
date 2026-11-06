import { createServices } from './container';
import { FakeGetHealthService } from './fakes/FakeGetHealthService';
import { FakeGetMeService } from './fakes/FakeGetMeService';
import { FakeLoginUserService } from './fakes/FakeLoginUserService';
import { GetHealthService } from './implementations/GetHealthService';
import { GetMeService } from './implementations/GetMeService';
import { LoginUserService } from './implementations/LoginUserService';

describe('createServices', () => {
  it('usa o serviço real quando ele não está na lista de falsos', () => {
    expect(createServices([]).getHealth).toBeInstanceOf(GetHealthService);
  });

  it('usa o falso quando o nome está na lista de falsos', () => {
    expect(createServices(['getHealth']).getHealth).toBeInstanceOf(FakeGetHealthService);
  });

  it('o login é real por padrão e falso quando "loginUser" está na lista', () => {
    expect(createServices([]).loginUser).toBeInstanceOf(LoginUserService);
    expect(createServices(['loginUser']).loginUser).toBeInstanceOf(FakeLoginUserService);
  });

  it('o /auth/me é real por padrão e falso quando "getMe" está na lista', () => {
    expect(createServices([]).getMe).toBeInstanceOf(GetMeService);
    expect(createServices(['getMe']).getMe).toBeInstanceOf(FakeGetMeService);
  });
});
