import { env } from '@/lib/env';
import { FakeGetHealthService } from './fakes/FakeGetHealthService';
import { FakeGetMeService } from './fakes/FakeGetMeService';
import {
  FakeCancelAuthorizationService,
  FakeCreateAuthorizationService,
  FakeGetAuthorizationService,
  FakeListAuthorizationsService,
  FakeListMyAuthorizationsService,
} from './fakes/FakeAuthorizationServices';
import {
  FakeClipboardService,
  FakeCurrentPositionService,
  FakeGetCameraAccessService,
  FakeOpenSettingsService,
  FakeRequestCameraAccessService,
  FakeVibrateService,
} from './fakes/FakeDeviceServices';
import {
  FakeCreateAccessPointService,
  FakeCreateBuildingService,
  FakeCreateTerminalService,
  FakeGetTerminalService,
  FakeListAccessPointsService,
  FakeListBuildingsService,
  FakeListTerminalsService,
  FakeRotateTerminalKeyService,
  FakeUpdateAccessPointService,
  FakeUpdateBuildingService,
  FakeUpdateTerminalService,
} from './fakes/FakeLocationServices';
import { FakeLoginUserService } from './fakes/FakeLoginUserService';
import {
  FakeCreateUserService,
  FakeGetUserService,
  FakeListUsersService,
  FakeUpdateUserService,
} from './fakes/FakeUserServices';
import {
  CancelAuthorizationService,
  CreateAuthorizationService,
  GetAuthorizationService,
  ListAuthorizationsService,
  ListMyAuthorizationsService,
} from './implementations/AuthorizationServices';
import { CreateUserService } from './implementations/CreateUserService';
import {
  ClipboardService,
  CurrentPositionService,
  GetCameraAccessService,
  OpenSettingsService,
  RequestCameraAccessService,
  VibrateService,
} from './implementations/DeviceServices';
import { GetHealthService } from './implementations/GetHealthService';
import { GetMeService } from './implementations/GetMeService';
import { GetUserService } from './implementations/GetUserService';
import { ListUsersService } from './implementations/ListUsersService';
import {
  CreateAccessPointService,
  CreateBuildingService,
  ListAccessPointsService,
  ListBuildingsService,
  UpdateAccessPointService,
  UpdateBuildingService,
} from './implementations/LocationServices';
import { LoginUserService } from './implementations/LoginUserService';
import {
  CreateTerminalService,
  GetTerminalService,
  ListTerminalsService,
  RotateTerminalKeyService,
  UpdateTerminalService,
} from './implementations/TerminalServices';
import { UpdateUserService } from './implementations/UpdateUserService';

// One entry per service; the names are the ones accepted in EXPO_PUBLIC_FAKE_SERVICES.
// "users" switches the four /users services together, since the fakes share one directory;
// "locations" does the same for buildings, access points and terminals, and "authorizations" for
// the services of /authorizations and /me/authorizations. "camera" switches what the QR reader
// asks of the phone: the permission, the vibration and the settings.
export const createServices = (fakeServices: string[]) => {
  const isFake = (name: string) => fakeServices.includes(name);
  const fakeUsers = isFake('users');
  const fakeLocations = isFake('locations');
  const fakeAuthorizations = isFake('authorizations');
  const fakeCamera = isFake('camera');

  return {
    getHealth: isFake('getHealth') ? new FakeGetHealthService() : new GetHealthService(),
    loginUser: isFake('loginUser') ? new FakeLoginUserService() : new LoginUserService(),
    getMe: isFake('getMe') ? new FakeGetMeService() : new GetMeService(),
    listUsers: fakeUsers ? new FakeListUsersService() : new ListUsersService(),
    getUser: fakeUsers ? new FakeGetUserService() : new GetUserService(),
    createUser: fakeUsers ? new FakeCreateUserService() : new CreateUserService(),
    updateUser: fakeUsers ? new FakeUpdateUserService() : new UpdateUserService(),
    listBuildings: fakeLocations ? new FakeListBuildingsService() : new ListBuildingsService(),
    createBuilding: fakeLocations ? new FakeCreateBuildingService() : new CreateBuildingService(),
    updateBuilding: fakeLocations ? new FakeUpdateBuildingService() : new UpdateBuildingService(),
    listAccessPoints: fakeLocations
      ? new FakeListAccessPointsService()
      : new ListAccessPointsService(),
    createAccessPoint: fakeLocations
      ? new FakeCreateAccessPointService()
      : new CreateAccessPointService(),
    updateAccessPoint: fakeLocations
      ? new FakeUpdateAccessPointService()
      : new UpdateAccessPointService(),
    listTerminals: fakeLocations ? new FakeListTerminalsService() : new ListTerminalsService(),
    getTerminal: fakeLocations ? new FakeGetTerminalService() : new GetTerminalService(),
    createTerminal: fakeLocations ? new FakeCreateTerminalService() : new CreateTerminalService(),
    updateTerminal: fakeLocations ? new FakeUpdateTerminalService() : new UpdateTerminalService(),
    rotateTerminalKey: fakeLocations
      ? new FakeRotateTerminalKeyService()
      : new RotateTerminalKeyService(),
    createAuthorization: fakeAuthorizations
      ? new FakeCreateAuthorizationService()
      : new CreateAuthorizationService(),
    listAuthorizations: fakeAuthorizations
      ? new FakeListAuthorizationsService()
      : new ListAuthorizationsService(),
    listMyAuthorizations: fakeAuthorizations
      ? new FakeListMyAuthorizationsService()
      : new ListMyAuthorizationsService(),
    getAuthorization: fakeAuthorizations
      ? new FakeGetAuthorizationService()
      : new GetAuthorizationService(),
    cancelAuthorization: fakeAuthorizations
      ? new FakeCancelAuthorizationService()
      : new CancelAuthorizationService(),
    currentPosition: isFake('currentPosition')
      ? new FakeCurrentPositionService()
      : new CurrentPositionService(),
    clipboard: isFake('clipboard') ? new FakeClipboardService() : new ClipboardService(),
    getCameraAccess: fakeCamera ? new FakeGetCameraAccessService() : new GetCameraAccessService(),
    requestCameraAccess: fakeCamera
      ? new FakeRequestCameraAccessService()
      : new RequestCameraAccessService(),
    vibrate: fakeCamera ? new FakeVibrateService() : new VibrateService(),
    openSettings: fakeCamera ? new FakeOpenSettingsService() : new OpenSettingsService(),
  };
};

export const services = createServices(env.fakeServices);
