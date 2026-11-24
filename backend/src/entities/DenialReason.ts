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
 * The reason of an event a terminal sends in a batch after an outage (B19). Those events carry the
 * terminal's own clock, so the NFC debounce must never take one for a read happening now.
 */
export const OFFLINE_DENIAL_REASON = 'TERMINAL_OFFLINE' satisfies DenialReason;

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

/**
 * The seven reasons an NFC read can deny with: the three about the tag and the person, then the four of the
 * `AccessEvaluator`. There is no distance, and the QR credential codes do not apply.
 */
export const NFC_DENIAL_REASONS = [
  'TAG_DESCONHECIDA',
  'TAG_INATIVA',
  'USUARIO_INATIVO',
  'SEM_AUTORIZACAO',
  'AUTORIZACAO_CANCELADA',
  'FORA_DO_PERIODO',
  'USOS_ESGOTADOS',
] as const satisfies readonly DenialReason[];

export type NfcDenialReason = (typeof NFC_DENIAL_REASONS)[number];

export const isNfcDenialReason = (value: unknown): value is NfcDenialReason =>
  (NFC_DENIAL_REASONS as readonly unknown[]).includes(value);
