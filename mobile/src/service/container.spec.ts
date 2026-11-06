import { createServices } from './container';
import { FakeGetHealthService } from './fakes/FakeGetHealthService';
import { FakeLoginUserService } from './fakes/FakeLoginUserService';
import { GetHealthService } from './implementations/GetHealthService';
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
});
