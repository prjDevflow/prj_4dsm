import type { QrDenialReason } from '../../entities/DenialReason';

/** What the app shows when a QR validation is denied (doc 03, section 4.4). */
export const QR_DENIAL_MESSAGES: Record<QrDenialReason, string> = {
  CREDENCIAL_INVALIDA: 'Este QR Code não é válido. Aponte para o QR Code da catraca.',
  CREDENCIAL_EXPIRADA: 'Este QR Code expirou. Leia o novo QR Code que aparece na tela.',
  CREDENCIAL_REUTILIZADA: 'Este QR Code já foi usado. Aguarde o próximo e leia de novo.',
  USUARIO_INATIVO: 'Seu cadastro está inativo. Procure a administração.',
  SEM_AUTORIZACAO: 'Você não tem autorização para este local.',
  AUTORIZACAO_CANCELADA: 'Sua autorização foi cancelada. Procure a administração.',
  FORA_DO_PERIODO: 'Sua autorização não vale para esta data ou horário.',
  USOS_ESGOTADOS: 'Você já usou todas as entradas desta autorização.',
  DISTANTE_DO_TERMINAL: 'Você está longe da catraca. Aproxime-se e tente de novo.',
  LOCALIZACAO_INVALIDA: 'Não conseguimos confirmar sua localização. Ative o GPS e tente de novo.',
};

/** What the app shows when it is allowed (doc 03, section 4.4). */
export const QR_GRANTED_MESSAGE = 'Acesso autorizado. Pode passar.';
