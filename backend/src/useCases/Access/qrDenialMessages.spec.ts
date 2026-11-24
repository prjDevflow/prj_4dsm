import { describe, expect, it } from 'vitest';
import { QR_DENIAL_REASONS } from '../../entities/DenialReason';
import { QR_DENIAL_MESSAGES, QR_GRANTED_MESSAGE } from './qrDenialMessages';

// Texts of doc 03, section 4.4, character by character: the app shows them as they are.
const contract = {
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
} as const;

describe('mensagens da validação por QR', () => {
  it.each(Object.entries(contract))('deve usar o texto do contrato para %s', (reason, message) => {
    expect(QR_DENIAL_MESSAGES[reason as keyof typeof QR_DENIAL_MESSAGES]).toBe(message);
  });

  it('deve ter uma mensagem para cada um dos dez motivos', () => {
    expect(Object.keys(QR_DENIAL_MESSAGES).sort()).toEqual([...QR_DENIAL_REASONS].sort());
  });

  it('deve usar o texto do contrato para o sucesso', () => {
    expect(QR_GRANTED_MESSAGE).toBe('Acesso autorizado. Pode passar.');
  });
});
