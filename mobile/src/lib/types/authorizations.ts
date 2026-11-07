import type { Perfil } from './auth';
import type { TipoPonto } from './locations';

// Autorizacao of backend/openapi.yaml (B08, B09).

/** Stored state: ATIVA or CANCELADA. */
export type SituacaoAutorizacao = 'ATIVA' | 'CANCELADA';

/** Computed by the server: also EXPIRADA (past `dataFim`) and ESGOTADA (no uses left). */
export type SituacaoEfetiva = 'ATIVA' | 'EXPIRADA' | 'ESGOTADA' | 'CANCELADA';

export interface Autorizacao {
  id: string;
  usuario: { id: string; nome: string; perfil: Perfil };
  local: {
    id: string;
    nome: string;
    tipo: TipoPonto;
    edificio: { id: string; nome: string };
  };
  /** "YYYY-MM-DD" in America/Sao_Paulo */
  dataInicio: string;
  dataFim: string;
  /** "HH:mm" */
  horaInicio: string;
  horaFim: string;
  usosPermitidos: number;
  usosRealizados: number;
  usosRestantes: number;
  situacao: SituacaoAutorizacao;
  situacaoEfetiva: SituacaoEfetiva;
  criadoPor: { id: string; nome: string };
  criadoEm: string;
  canceladoPor: { id: string; nome: string } | null;
  canceladoEm: string | null;
  motivoCancelamento: string | null;
}

/** POST /authorizations: the eight fields of RF03 (the state is always born ATIVA). */
export interface CreateAuthorizationBody {
  usuarioId: string;
  accessPointId: string;
  dataInicio: string;
  dataFim: string;
  horaInicio: string;
  horaFim: string;
  usosPermitidos: number;
}

/** GET /authorizations: the filters left undefined are not sent. */
export interface ListAuthorizationsParams {
  usuarioId?: string;
  accessPointId?: string;
  /** The effective state, computed by the server. */
  situacao?: SituacaoEfetiva;
  /** "YYYY-MM-DD": keeps the ones whose period overlaps dataDe to dataAte. */
  dataDe?: string;
  dataAte?: string;
  page: number;
  pageSize: number;
}

/** GET /me/authorizations: whose they are comes from the token. */
export type ListMyAuthorizationsParams = Pick<
  ListAuthorizationsParams,
  'situacao' | 'page' | 'pageSize'
>;
