import { createServices } from './container';
import { FakeCreateAuthorizationService } from './fakes/FakeAuthorizationServices';
import { CreateAuthorizationService } from './implementations/AuthorizationServices';
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
import { FakeClipboardService, FakeCurrentPositionService } from './fakes/FakeDeviceServices';
import {
  FakeListBuildingsService,
  FakeRotateTerminalKeyService,
} from './fakes/FakeLocationServices';
import { ClipboardService, CurrentPositionService } from './implementations/DeviceServices';
import { ListBuildingsService } from './implementations/LocationServices';
import { RotateTerminalKeyService } from './implementations/TerminalServices';

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

  it('os serviços de usuários são reais por padrão e falsos com "users" na lista', () => {
    const real = createServices([]);
    expect(real.listUsers).toBeInstanceOf(ListUsersService);
    expect(real.getUser).toBeInstanceOf(GetUserService);
    expect(real.createUser).toBeInstanceOf(CreateUserService);
    expect(real.updateUser).toBeInstanceOf(UpdateUserService);

    const fake = createServices(['users']);
    expect(fake.listUsers).toBeInstanceOf(FakeListUsersService);
    expect(fake.getUser).toBeInstanceOf(FakeGetUserService);
    expect(fake.createUser).toBeInstanceOf(FakeCreateUserService);
    expect(fake.updateUser).toBeInstanceOf(FakeUpdateUserService);
  });

  it('locais e terminais são reais por padrão e falsos com "locations" na lista', () => {
    expect(createServices([]).listBuildings).toBeInstanceOf(ListBuildingsService);
    expect(createServices([]).rotateTerminalKey).toBeInstanceOf(RotateTerminalKeyService);
    expect(createServices(['locations']).listBuildings).toBeInstanceOf(FakeListBuildingsService);
    expect(createServices(['locations']).rotateTerminalKey).toBeInstanceOf(
      FakeRotateTerminalKeyService,
    );
  });

  it('localização e área de transferência do aparelho têm falsos próprios', () => {
    expect(createServices([]).currentPosition).toBeInstanceOf(CurrentPositionService);
    expect(createServices([]).clipboard).toBeInstanceOf(ClipboardService);
    expect(createServices(['currentPosition', 'clipboard']).currentPosition).toBeInstanceOf(
      FakeCurrentPositionService,
    );
    expect(createServices(['clipboard']).clipboard).toBeInstanceOf(FakeClipboardService);
  });

  it('autorizações são reais por padrão e falsas com "authorizations" na lista', () => {
    expect(createServices([]).createAuthorization).toBeInstanceOf(CreateAuthorizationService);
    expect(createServices(['authorizations']).createAuthorization).toBeInstanceOf(
      FakeCreateAuthorizationService,
    );
  });
});
