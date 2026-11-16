import { createServices } from './container';
import {
  FakeListAccessEventsService,
  FakeListMyAccessEventsService,
} from './fakes/FakeAccessEventServices';
import { FakeValidateQrService } from './fakes/FakeAccessServices';
import {
  FakeCancelAuthorizationService,
  FakeCreateAuthorizationService,
  FakeGetAuthorizationService,
  FakeListAuthorizationsService,
  FakeListMyAuthorizationsService,
} from './fakes/FakeAuthorizationServices';
import {
  CancelAuthorizationService,
  CreateAuthorizationService,
  GetAuthorizationService,
  ListAuthorizationsService,
  ListMyAuthorizationsService,
} from './implementations/AuthorizationServices';
import { FakeGetHealthService } from './fakes/FakeGetHealthService';
import { FakeGetMeService } from './fakes/FakeGetMeService';
import { FakeLoginUserService } from './fakes/FakeLoginUserService';
import {
  FakeGetLocationAccessService,
  FakeGetPositionService,
  FakePreparePositionService,
  FakeRequestLocationAccessService,
  FakeResultFeedbackService,
  FakeSimulatePositionService,
} from './fakes/FakePositionServices';
import {
  FakeCreateUserService,
  FakeGetUserService,
  FakeListUsersService,
  FakeUpdateUserService,
} from './fakes/FakeUserServices';
import {
  ListAccessEventsService,
  ListMyAccessEventsService,
} from './implementations/AccessEventServices';
import { ValidateQrService } from './implementations/AccessServices';
import { CreateUserService } from './implementations/CreateUserService';
import { GetHealthService } from './implementations/GetHealthService';
import { GetMeService } from './implementations/GetMeService';
import { GetUserService } from './implementations/GetUserService';
import { ListUsersService } from './implementations/ListUsersService';
import { LoginUserService } from './implementations/LoginUserService';
import {
  GetLocationAccessService,
  GetPositionService,
  PreparePositionService,
  RequestLocationAccessService,
  ResultFeedbackService,
  SimulatePositionService,
} from './implementations/PositionServices';
import { UpdateUserService } from './implementations/UpdateUserService';
import {
  FakeClipboardService,
  FakeCurrentPositionService,
  FakeGetCameraAccessService,
  FakeOpenSettingsService,
  FakeRequestCameraAccessService,
  FakeVibrateService,
} from './fakes/FakeDeviceServices';
import {
  FakeListBuildingsService,
  FakeRotateTerminalKeyService,
} from './fakes/FakeLocationServices';
import {
  ClipboardService,
  CurrentPositionService,
  GetCameraAccessService,
  OpenSettingsService,
  RequestCameraAccessService,
  VibrateService,
} from './implementations/DeviceServices';
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

  it('câmera, vibração e configurações são reais por padrão e falsas com "camera" na lista', () => {
    const real = createServices([]);
    const fake = createServices(['camera']);

    expect(real.getCameraAccess).toBeInstanceOf(GetCameraAccessService);
    expect(real.requestCameraAccess).toBeInstanceOf(RequestCameraAccessService);
    expect(real.vibrate).toBeInstanceOf(VibrateService);
    expect(real.openSettings).toBeInstanceOf(OpenSettingsService);
    expect(fake.getCameraAccess).toBeInstanceOf(FakeGetCameraAccessService);
    expect(fake.requestCameraAccess).toBeInstanceOf(FakeRequestCameraAccessService);
    expect(fake.vibrate).toBeInstanceOf(FakeVibrateService);
    expect(fake.openSettings).toBeInstanceOf(FakeOpenSettingsService);
  });

  it('a posição da validação é real por padrão e falsa com "position" na lista', () => {
    const real = createServices([]);
    const fake = createServices(['position']);

    expect(real.getLocationAccess).toBeInstanceOf(GetLocationAccessService);
    expect(real.requestLocationAccess).toBeInstanceOf(RequestLocationAccessService);
    expect(real.preparePosition).toBeInstanceOf(PreparePositionService);
    expect(real.getPosition).toBeInstanceOf(GetPositionService);
    expect(real.simulatePosition).toBeInstanceOf(SimulatePositionService);
    expect(fake.getLocationAccess).toBeInstanceOf(FakeGetLocationAccessService);
    expect(fake.requestLocationAccess).toBeInstanceOf(FakeRequestLocationAccessService);
    expect(fake.preparePosition).toBeInstanceOf(FakePreparePositionService);
    expect(fake.getPosition).toBeInstanceOf(FakeGetPositionService);
    expect(fake.simulatePosition).toBeInstanceOf(FakeSimulatePositionService);
  });

  it('o histórico é real por padrão e falso com "accessEvents" na lista', () => {
    const real = createServices([]);
    const fake = createServices(['accessEvents']);

    expect(real.listAccessEvents).toBeInstanceOf(ListAccessEventsService);
    expect(real.listMyAccessEvents).toBeInstanceOf(ListMyAccessEventsService);
    expect(fake.listAccessEvents).toBeInstanceOf(FakeListAccessEventsService);
    expect(fake.listMyAccessEvents).toBeInstanceOf(FakeListMyAccessEventsService);
  });

  it('a validação do QR é real por padrão e falsa com "validateQr" na lista', () => {
    expect(createServices([]).validateQr).toBeInstanceOf(ValidateQrService);
    expect(createServices(['validateQr']).validateQr).toBeInstanceOf(FakeValidateQrService);
  });

  it('a vibração do resultado acompanha a do leitor, em "camera"', () => {
    expect(createServices([]).resultFeedback).toBeInstanceOf(ResultFeedbackService);
    expect(createServices(['camera']).resultFeedback).toBeInstanceOf(FakeResultFeedbackService);
  });

  it('autorizações são reais por padrão e falsas com "authorizations" na lista', () => {
    const real = createServices([]);
    expect(real.createAuthorization).toBeInstanceOf(CreateAuthorizationService);
    expect(real.listAuthorizations).toBeInstanceOf(ListAuthorizationsService);
    expect(real.listMyAuthorizations).toBeInstanceOf(ListMyAuthorizationsService);
    expect(real.getAuthorization).toBeInstanceOf(GetAuthorizationService);
    expect(real.cancelAuthorization).toBeInstanceOf(CancelAuthorizationService);

    const fake = createServices(['authorizations']);
    expect(fake.createAuthorization).toBeInstanceOf(FakeCreateAuthorizationService);
    expect(fake.listAuthorizations).toBeInstanceOf(FakeListAuthorizationsService);
    expect(fake.listMyAuthorizations).toBeInstanceOf(FakeListMyAuthorizationsService);
    expect(fake.getAuthorization).toBeInstanceOf(FakeGetAuthorizationService);
    expect(fake.cancelAuthorization).toBeInstanceOf(FakeCancelAuthorizationService);
  });
});
