import type {
  AuthorizationStatus,
  EffectiveAuthorizationStatus,
} from '../../entities/Authorization';
import type { AccessPointType } from '../../entities/AccessPoint';
import type { UserProfile } from '../../entities/User';
import { computeEffectiveStatus } from '../../entities/rules/computeEffectiveStatus';
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

export function toAuthorizationView(details: AuthorizationDetails, now: Date): AuthorizationView {
  const { authorization: a } = details;
  return {
    id: a.id,
    usuario: details.usuario,
    local: details.local,
    dataInicio: a.dataInicio,
    dataFim: a.dataFim,
    horaInicio: a.horaInicio,
    horaFim: a.horaFim,
    usosPermitidos: a.usosPermitidos,
    usosRealizados: a.usosRealizados,
    usosRestantes: Math.max(0, a.usosPermitidos - a.usosRealizados),
    situacao: a.situacao,
    situacaoEfetiva: computeEffectiveStatus(a, now),
    criadoPor: details.criadoPor,
    criadoEm: a.criadoEm,
    canceladoPor: details.canceladoPor,
    canceladoEm: a.canceladoEm,
    motivoCancelamento: a.motivoCancelamento,
  };
}
