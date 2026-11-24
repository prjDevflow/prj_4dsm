import { iconNames } from '@/components/Icon';
import { denialReasons, isDenialReason, type DenialReason } from './denialReasons';

// Word for word what the API answers (backend/src/useCases/Access/qrDenialMessages.ts).
const contract: [DenialReason, string, 'tente' | 'negado', string, string][] = [
  [
    'CREDENCIAL_INVALIDA',
    'Este QR Code não é válido. Aponte para o QR Code da catraca.',
    'tente',
    'qr_code_2',
    'lerOutro',
  ],
  [
    'CREDENCIAL_EXPIRADA',
    'Este QR Code expirou. Leia o novo QR Code que aparece na tela.',
    'tente',
    'timer_off',
    'lerOutro',
  ],
  [
    'CREDENCIAL_REUTILIZADA',
    'Este QR Code já foi usado. Aguarde o próximo e leia de novo.',
    'tente',
    'restart_alt',
    'lerOutro',
  ],
  [
    'DISTANTE_DO_TERMINAL',
    'Você está longe da catraca. Aproxime-se e tente de novo.',
    'tente',
    'wrong_location',
    'tentarDeNovo',
  ],
  [
    'LOCALIZACAO_INVALIDA',
    'Não conseguimos confirmar sua localização. Ative o GPS e tente de novo.',
    'tente',
    'location_off',
    'tentarDeNovo',
  ],
  [
    'SEM_AUTORIZACAO',
    'Você não tem autorização para este local.',
    'negado',
    'block',
    'minhasAutorizacoes',
  ],
  [
    'AUTORIZACAO_CANCELADA',
    'Sua autorização foi cancelada. Procure a administração.',
    'negado',
    'cancel',
    'minhasAutorizacoes',
  ],
  [
    'FORA_DO_PERIODO',
    'Sua autorização não vale para esta data ou horário.',
    'negado',
    'event_busy',
    'minhasAutorizacoes',
  ],
  [
    'USOS_ESGOTADOS',
    'Você já usou todas as entradas desta autorização.',
    'negado',
    'remove_circle',
    'minhasAutorizacoes',
  ],
  [
    'USUARIO_INATIVO',
    'Seu cadastro está inativo. Procure a administração.',
    'negado',
    'person_off',
    'minhasAutorizacoes',
  ],
];

describe('denialReasons', () => {
  it.each(contract)('%s tem o texto, o tom, o ícone e o botão da tabela', (code, ...row) => {
    const [message, tone, icon, action] = row;

    expect(denialReasons[code]).toEqual({ message, tone, icon, action });
  });

  it('tem exatamente os 10 motivos do app', () => {
    expect(Object.keys(denialReasons).sort()).toEqual(contract.map(([code]) => code).sort());
  });

  it.each(contract.map(([code, , , icon]) => [code, icon]))(
    '%s usa um ícone que o app desenha',
    (_, icon) => {
      expect(iconNames).toContain(icon);
    },
  );

  it.each(contract.map(([code]) => code))('%s é um motivo de negação', (code) => {
    expect(isDenialReason(code)).toBe(true);
  });

  it.each([
    'FORBIDDEN',
    'TAG_DESCONHECIDA',
    'TAG_INATIVA',
    'TERMINAL_OFFLINE',
    'toString',
    'constructor',
    '',
  ])('"%s" não é um motivo que o app mostra', (code) => {
    expect(isDenialReason(code)).toBe(false);
  });
});
