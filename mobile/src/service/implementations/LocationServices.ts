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
import { AxiosInstance } from '../AxiosInstance';
import type {
  IListBuildingsService,
  ICreateBuildingService,
  IUpdateBuildingService,
  IListAccessPointsService,
  ICreateAccessPointService,
  IUpdateAccessPointService,
} from '../ILocationService';

// /buildings and /access-points (B07). Nothing is deleted: deactivating is `ativo: false`.

export class ListBuildingsService implements IListBuildingsService {
  async exec(params: ListParams): Promise<Page<Edificio>> {
    const { data } = await AxiosInstance.get<Page<Edificio>>('/buildings', { params });
    return data;
  }
}

export class CreateBuildingService implements ICreateBuildingService {
  async exec(body: CreateBuildingBody): Promise<Edificio> {
    const { data } = await AxiosInstance.post<Edificio>('/buildings', body);
    return data;
  }
}

/** Deactivating a building deactivates its access points too (409 if one has authorizations). */
export class UpdateBuildingService implements IUpdateBuildingService {
  async exec(id: string, body: UpdateBuildingBody): Promise<Edificio> {
    const { data } = await AxiosInstance.patch<Edificio>(
      `/buildings/${encodeURIComponent(id)}`,
      body,
    );
    return data;
  }
}

export class ListAccessPointsService implements IListAccessPointsService {
  async exec(params: ListParams): Promise<Page<PontoDeAcesso>> {
    const { data } = await AxiosInstance.get<Page<PontoDeAcesso>>('/access-points', { params });
    return data;
  }
}

export class CreateAccessPointService implements ICreateAccessPointService {
  async exec(body: CreateAccessPointBody): Promise<PontoDeAcesso> {
    const { data } = await AxiosInstance.post<PontoDeAcesso>('/access-points', body);
    return data;
  }
}

export class UpdateAccessPointService implements IUpdateAccessPointService {
  async exec(id: string, body: UpdateAccessPointBody): Promise<PontoDeAcesso> {
    const { data } = await AxiosInstance.patch<PontoDeAcesso>(
      `/access-points/${encodeURIComponent(id)}`,
      body,
    );
    return data;
  }
}
