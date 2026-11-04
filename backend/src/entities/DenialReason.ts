/**
 * Every reason code of doc 03, section 4.4. The decision of an access attempt uses a subset of them;
 * `TERMINAL_OFFLINE` only appears in events the terminal sends later (B19).
 */
export const DENIAL_REASONS = [
  'CREDENCIAL_INVALIDA',
  'CREDENCIAL_EXPIRADA',
  'CREDENCIAL_REUTILIZADA',
  'USUARIO_INATIVO',
  'SEM_AUTORIZACAO',
  'AUTORIZACAO_CANCELADA',
  'FORA_DO_PERIODO',
  'USOS_ESGOTADOS',
  'DISTANTE_DO_TERMINAL',
  'LOCALIZACAO_INVALIDA',
  'TAG_DESCONHECIDA',
  'TAG_INATIVA',
  'TERMINAL_OFFLINE',
] as const;

export type DenialReason = (typeof DENIAL_REASONS)[number];
