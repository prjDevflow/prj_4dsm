import type { IconName } from '@/components/Icon';
import { denialReasons, type DenialAction, type DenialTone } from '@/lib/denialReasons';
import type { AccessResult } from './validateAccess.model';

export type ResultTone = 'autorizado' | DenialTone;

export type ResultContent = {
  tone: ResultTone;
  icon: IconName;
  title: string;
  message: string;
  /** The first button of T11; the T10 has only "Concluir". */
  action: DenialAction | null;
};

const NOT_VALIDATED = 'Acesso não validado';

/** Icon, title and text always travel together with the color: it is never the only cue. */
export const resultContent = (result: AccessResult): ResultContent => {
  switch (result.tipo) {
    case 'AUTORIZADO':
      return {
        tone: 'autorizado',
        icon: 'check',
        title: 'Acesso autorizado',
        message: 'Pode passar pela catraca.',
        action: null,
      };
    case 'NEGADO':
      return { ...denialReasons[result.motivo], title: 'Acesso negado' };
    // Not denials: nobody decided anything, so the screen does not say "Acesso negado".
    case 'SEM_CONEXAO':
      return {
        tone: 'tente',
        icon: 'wifi_off',
        title: NOT_VALIDATED,
        message: 'Sem conexão. Verifique sua internet e leia o QR Code de novo.',
        action: 'lerOutro',
      };
    case 'ERRO_SERVIDOR':
      return {
        tone: 'tente',
        icon: 'error',
        title: NOT_VALIDATED,
        message: 'Não foi possível validar agora. Tente de novo em instantes.',
        action: 'lerOutro',
      };
  }
};
