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

/**
 * The ten reasons a QR validation can deny with (doc 03, section 4.4): the eleven checks of section 5.1
 * share these codes, since check 4 reuses `CREDENCIAL_INVALIDA`. The NFC codes and `TERMINAL_OFFLINE` do not apply.
 */
export const QR_DENIAL_REASONS = [
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
] as const satisfies readonly DenialReason[];

export type QrDenialReason = (typeof QR_DENIAL_REASONS)[number];
