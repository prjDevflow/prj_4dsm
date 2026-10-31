import type { AccessPointType } from '../entities/AccessPoint';
import type { Authorization, EffectiveAuthorizationStatus } from '../entities/Authorization';
import type { UserProfile } from '../entities/User';

/** An authorization with the people and the place it refers to already resolved (read model). */
export interface AuthorizationDetails {
  authorization: Authorization;
  usuario: { id: string; nome: string; perfil: UserProfile };
  local: {
    id: string;
    nome: string;
    tipo: AccessPointType;
    edificio: { id: string; nome: string };
  };
  criadoPor: { id: string; nome: string };
  canceladoPor: { id: string; nome: string } | null;
}

export interface AuthorizationListFilter {
  usuarioId?: string;
  accessPointId?: string;
  /** The effective status, as the API exposes it. Decided in the query, not in memory. */
  situacao?: EffectiveAuthorizationStatus;
  /** YYYY-MM-DD. Keeps the authorizations whose period overlaps [dataDe, dataAte], ends included. */
  dataDe?: string;
  dataAte?: string;
  /** The instant that decides "today" (America/Sao_Paulo) for the effective status. */
  now: Date;
  /** `recent`: newest first. `dataFim`: the ones that end first come first. Both break ties by id. */
  sort: 'recent' | 'dataFim';
  page: number;
  pageSize: number;
}

export interface AuthorizationListResult {
  items: AuthorizationDetails[];
  total: number;
}

/**
 * "Active and not expired" means stored status `ATIVA` and `dataFim` today or later (usage is ignored).
 */
export interface IAuthorizationRepository {
  /** `today` is YYYY-MM-DD in America/Sao_Paulo. */
  hasActiveNonExpiredForAccessPoint(accessPointId: string, today: string): Promise<boolean>;
  /** Same, for any access point of the building. */
  hasActiveNonExpiredForBuilding(buildingId: string, today: string): Promise<boolean>;
  /** Inserts a new authorization. The user, the access point and the author must exist. */
  save(authorization: Authorization): Promise<void>;
  /** The id must already be validated (a malformed id would make the database fail instead of returning null). */
  findViewById(id: string): Promise<AuthorizationDetails | null>;
  list(filter: AuthorizationListFilter): Promise<AuthorizationListResult>;
  /**
   * Cancels only while the stored status is still `ATIVA`, in one statement, so two cancellations
   * at once cannot overwrite each other. Returns whether this call was the one that cancelled.
   */
  cancelIfActive(input: {
    id: string;
    canceladoPorId: string;
    canceladoEm: Date;
    motivo: string | null;
  }): Promise<boolean>;
}
