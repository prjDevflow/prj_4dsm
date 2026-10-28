import type {
  AuthorizationStatus,
  EffectiveAuthorizationStatus,
} from '../../entities/Authorization';
import type { AccessPointType } from '../../entities/AccessPoint';
import type { UserProfile } from '../../entities/User';
import type { AuthorizationDetails } from '../../repositories/IAuthorizationRepository';

/** The authorization as the API exposes it, with the computed fields. */
export interface AuthorizationView {
  id: string;
  usuario: { id: string; nome: string; perfil: UserProfile };
  local: {
    id: string;
    nome: string;
    tipo: AccessPointType;
    edificio: { id: string; nome: string };
  };
  dataInicio: string;
  dataFim: string;
  horaInicio: string;
  horaFim: string;
  usosPermitidos: number;
  usosRealizados: number;
  usosRestantes: number;
  situacao: AuthorizationStatus;
  situacaoEfetiva: EffectiveAuthorizationStatus;
  criadoPor: { id: string; nome: string };
  criadoEm: Date;
  canceladoPor: { id: string; nome: string } | null;
  canceladoEm: Date | null;
  motivoCancelamento: string | null;
}

export function toAuthorizationView(_details: AuthorizationDetails, _now: Date): AuthorizationView {
  throw new Error('B08: ainda não implementado');
}
