import type {
  CreateAccessPointBody,
  CreateBuildingBody,
  Edificio,
  ListParams,
  PontoDeAcesso,
  UpdateAccessPointBody,
  UpdateBuildingBody,
} from '@/lib/types/locations';
import type { Page } from '@/lib/types/page';

export interface IListBuildingsService {
  exec: (params: ListParams) => Promise<Page<Edificio>>;
}

export interface ICreateBuildingService {
  exec: (body: CreateBuildingBody) => Promise<Edificio>;
}

export interface IUpdateBuildingService {
  exec: (id: string, body: UpdateBuildingBody) => Promise<Edificio>;
}

export interface IListAccessPointsService {
  exec: (params: ListParams) => Promise<Page<PontoDeAcesso>>;
}

export interface ICreateAccessPointService {
  exec: (body: CreateAccessPointBody) => Promise<PontoDeAcesso>;
}

export interface IUpdateAccessPointService {
  exec: (id: string, body: UpdateAccessPointBody) => Promise<PontoDeAcesso>;
}
