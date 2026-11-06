import { env } from '@/lib/env';
import { FakeGetHealthService } from './fakes/FakeGetHealthService';
import { FakeGetMeService } from './fakes/FakeGetMeService';
import { FakeClipboardService, FakeCurrentPositionService } from './fakes/FakeDeviceServices';
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
import { CreateUserService } from './implementations/CreateUserService';
import { ClipboardService, CurrentPositionService } from './implementations/DeviceServices';
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
// "locations" does the same for buildings, access points and terminals.
export const createServices = (fakeServices: string[]) => {
  const isFake = (name: string) => fakeServices.includes(name);
  const fakeUsers = isFake('users');
  const fakeLocations = isFake('locations');

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
    currentPosition: isFake('currentPosition')
      ? new FakeCurrentPositionService()
      : new CurrentPositionService(),
    clipboard: isFake('clipboard') ? new FakeClipboardService() : new ClipboardService(),
  };
};

export const services = createServices(env.fakeServices);
