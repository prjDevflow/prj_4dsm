import type { AccessPointType } from '../entities/AccessPoint';
import type { Authorization } from '../entities/Authorization';
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

/**
 * "Active and not expired" means stored status `ATIVA` and `dataFim` today or later (usage is ignored).
 * B09 grows this port again.
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
}
