import type { IconName } from '@/components/Icon';

export type DenialTone = 'tente' | 'negado';
export type DenialAction = 'lerOutro' | 'tentarDeNovo' | 'minhasAutorizacoes';

export type DenialReasonInfo = {
  /** The `message` of the contract, word for word. */
  message: string;
  /** "tente": the person solves it (amber). "negado": it depends on the admin or another date (red). */
  tone: DenialTone;
  icon: IconName;
  action: DenialAction;
};

// tokens.md, T11, and section 4.4 of the contract. The screen never writes one of these by hand.
export const denialReasons = {
  CREDENCIAL_INVALIDA: {
    message: 'Este QR Code não é válido. Aponte para o QR Code da catraca.',
    tone: 'tente',
    icon: 'qr_code_2',
    action: 'lerOutro',
  },
  CREDENCIAL_EXPIRADA: {
    message: 'Este QR Code expirou. Leia o novo QR Code que aparece na tela.',
    tone: 'tente',
    icon: 'timer_off',
    action: 'lerOutro',
  },
  CREDENCIAL_REUTILIZADA: {
    message: 'Este QR Code já foi usado. Aguarde o próximo e leia de novo.',
    tone: 'tente',
    icon: 'restart_alt',
    action: 'lerOutro',
  },
  DISTANTE_DO_TERMINAL: {
    message: 'Você está longe da catraca. Aproxime-se e tente de novo.',
    tone: 'tente',
    icon: 'wrong_location',
    action: 'tentarDeNovo',
  },
  LOCALIZACAO_INVALIDA: {
    message: 'Não conseguimos confirmar sua localização. Ative o GPS e tente de novo.',
    tone: 'tente',
    icon: 'location_off',
    action: 'tentarDeNovo',
  },
  SEM_AUTORIZACAO: {
    message: 'Você não tem autorização para este local.',
    tone: 'negado',
    icon: 'block',
    action: 'minhasAutorizacoes',
  },
  AUTORIZACAO_CANCELADA: {
    message: 'Sua autorização foi cancelada. Procure a administração.',
    tone: 'negado',
    icon: 'cancel',
    action: 'minhasAutorizacoes',
  },
  FORA_DO_PERIODO: {
    message: 'Sua autorização não vale para esta data ou horário.',
    tone: 'negado',
    icon: 'event_busy',
    action: 'minhasAutorizacoes',
  },
  USOS_ESGOTADOS: {
    message: 'Você já usou todas as entradas desta autorização.',
    tone: 'negado',
    icon: 'remove_circle',
    action: 'minhasAutorizacoes',
  },
  USUARIO_INATIVO: {
    message: 'Seu cadastro está inativo. Procure a administração.',
    tone: 'negado',
    icon: 'person_off',
    action: 'minhasAutorizacoes',
  },
} as const satisfies Record<string, DenialReasonInfo>;

export type DenialReason = keyof typeof denialReasons;

export const isDenialReason = (code: string): code is DenialReason =>
  Object.hasOwn(denialReasons, code);
