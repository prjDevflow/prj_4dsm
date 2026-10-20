/** What the database stores. EXPIRADA and ESGOTADA are computed on read (see rules/computeEffectiveStatus). */
export type AuthorizationStatus = 'ATIVA' | 'CANCELADA';

export type EffectiveAuthorizationStatus = AuthorizationStatus | 'EXPIRADA' | 'ESGOTADA';

export interface Authorization {
  id: string;
  usuarioId: string;
  accessPointId: string;
  /** YYYY-MM-DD, evaluated in America/Sao_Paulo. */
  dataInicio: string;
  dataFim: string;
  /** HH:mm (24 h), evaluated in America/Sao_Paulo. */
  horaInicio: string;
  horaFim: string;
  usosPermitidos: number;
  usosRealizados: number;
  situacao: AuthorizationStatus;
  criadoPorId: string;
  criadoEm: Date;
  canceladoPorId: string | null;
  canceladoEm: Date | null;
  motivoCancelamento: string | null;
}
