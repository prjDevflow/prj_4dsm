import type { IconName } from '@/components/Icon';
import { inSaoPaulo } from './dateValue';
import type { MetodoAcesso } from './types/accessEvents';

// T26, T27 and T12: the history shows short labels, as in the Figma. The full sentences of the
// result screen stay in denialReasons; the code never reaches the screen.
const reasonLabels = {
  CREDENCIAL_INVALIDA: 'QR Code inválido',
  CREDENCIAL_EXPIRADA: 'QR Code expirado',
  CREDENCIAL_REUTILIZADA: 'QR Code já usado',
  DISTANTE_DO_TERMINAL: 'Longe da catraca',
  LOCALIZACAO_INVALIDA: 'Sem localização',
  SEM_AUTORIZACAO: 'Sem autorização',
  AUTORIZACAO_CANCELADA: 'Autorização cancelada',
  FORA_DO_PERIODO: 'Fora do período',
  USOS_ESGOTADOS: 'Entradas esgotadas',
  USUARIO_INATIVO: 'Cadastro inativo',
  // Only in the history: they come from the NFC (B17) and from the terminal offline (B19).
  TAG_DESCONHECIDA: 'Tag não reconhecida',
  TAG_INATIVA: 'Tag desativada',
  TERMINAL_OFFLINE: 'Terminal sem conexão',
} as const;

export type AccessReason = keyof typeof reasonLabels;

const UNKNOWN_REASON = 'Motivo não informado';

export const accessReasonLabel = (code: string | null) =>
  code && Object.hasOwn(reasonLabels, code) ? reasonLabels[code as AccessReason] : UNKNOWN_REASON;

/** The "Motivo" filter, in the order of the contract. */
export const accessReasonOptions = (Object.keys(reasonLabels) as AccessReason[]).map((value) => ({
  value,
  label: reasonLabels[value],
}));

export const metodoLabels: Record<MetodoAcesso, string> = { QR: 'QR Code', NFC: 'Tag NFC' };

export const metodoIcons: Record<MetodoAcesso, IconName> = { QR: 'qr_code_scanner', NFC: 'nfc' };

const pad = (value: number) => String(value).padStart(2, '0');

const withSeconds = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/** Read from the formatted text, like inSaoPaulo: formatToParts is not dependable on Hermes for iOS. */
const partsInSaoPaulo = (instant: string) => {
  const [day, month, year, hour, minute, second] =
    withSeconds.format(new Date(instant)).match(/\d+/g) ?? [];
  return { day, month, year, time: `${pad(Number(hour) % 24)}:${minute}:${second}` };
};

/** "24/10 14:32:07" in the lists. */
export const formatEventTime = (instant: string) => {
  const { day, month, time } = partsInSaoPaulo(instant);
  return `${day}/${month} ${time}`;
};

/** "24/10/2026 às 14:32:07" in the detail. */
export const formatEventDateTime = (instant: string) => {
  const { day, month, year, time } = partsInSaoPaulo(instant);
  return `${day}/${month}/${year} às ${time}`;
};

const shiftDays = (isoDate: string, days: number) => {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/** Today and the days before it, as days of São Paulo ("YYYY-MM-DD"). */
export const lastDays = (now: Date, days: number) => {
  const today = inSaoPaulo(now).date;
  return { dataDe: shiftDays(today, -(days - 1)), dataAte: today };
};

// São Paulo has kept -03:00 all year since 2019 (no daylight saving).
const SAO_PAULO_OFFSET = '-03:00';

/** Days of the period → instants for `de` and `ate`, both inclusive, from 00:00 to the last ms. */
export const periodInstants = (dataDe: string | null, dataAte: string | null) => ({
  de: dataDe ? `${dataDe}T00:00:00${SAO_PAULO_OFFSET}` : undefined,
  ate: dataAte ? `${dataAte}T23:59:59.999${SAO_PAULO_OFFSET}` : undefined,
});
